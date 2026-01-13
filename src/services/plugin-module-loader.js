/**
 * Plugin Module Loader
 * In-browser ES module loader for plugin components stored in AgentFS
 * 
 * Since plugin JS files live in AgentFS (not the real filesystem),
 * browsers can't import() them directly. This loader:
 * 1. Reads JS files from AgentFS
 * 2. Parses import statements
 * 3. Recursively loads dependencies
 * 4. Rewrites imports to Blob URLs
 * 5. Returns a dynamic import of the rewritten module
 * 
 * @module PluginModuleLoader
 */

import * as agentfs from './agentfs.js';

class PluginModuleLoader extends EventTarget {
  /** @type {Map<string, string>} path -> blobUrl */
  #blobCache = new Map();
  
  /** @type {Map<string, any>} path -> module exports */
  #moduleCache = new Map();

  /**
   * Load a plugin component (JS + CSS)
   * @param {string} basePath - Component directory path (e.g., /plugins/hello/components/badge)
   * @returns {Promise<{ module: any, styles: string }>}
   */
  async loadComponent(basePath) {
    const jsPath = `${basePath}/index.js`;
    const cssPath = `${basePath}/styles.css`;
    
    // Load JS module
    const module = await this.loadModule(jsPath);
    
    // Load CSS (may not exist)
    let styles = '';
    try {
      const css = await agentfs.readFile(cssPath, 'utf-8');
      if (css) {
        styles = css;
      }
    } catch {
      // No styles file
    }
    
    return { module, styles };
  }

  /**
   * Load an ES module from AgentFS
   * @param {string} path - Path to JS file in AgentFS
   * @returns {Promise<any>} Module exports
   */
  async loadModule(path) {
    // Check cache
    if (this.#moduleCache.has(path)) {
      return this.#moduleCache.get(path);
    }
    
    // Create blob URL and import
    const blobUrl = await this.#createModuleBlobUrl(path);
    
    try {
      const module = await import(/* @vite-ignore */ blobUrl);
      this.#moduleCache.set(path, module);
      return module;
    } catch (err) {
      console.error(`[PluginModuleLoader] Failed to import ${path}:`, err);
      throw err;
    }
  }

  /**
   * Create a Blob URL for a module, rewriting imports
   * @param {string} path - Path to JS file
   * @returns {Promise<string>} Blob URL
   */
  async #createModuleBlobUrl(path) {
    // Check blob cache
    if (this.#blobCache.has(path)) {
      return this.#blobCache.get(path);
    }
    
    // Read the source
    const code = await agentfs.readFile(path, 'utf-8');
    if (!code) {
      throw new Error(`Module not found: ${path}`);
    }
    
    const basePath = path.replace(/\/[^/]+$/, '');
    
    // Rewrite relative imports
    const rewrittenCode = await this.#rewriteImports(code, basePath);
    
    // Create blob
    const blob = new Blob([rewrittenCode], { type: 'text/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    
    this.#blobCache.set(path, blobUrl);
    
    return blobUrl;
  }

  /**
   * Rewrite relative imports in module source
   * @param {string} code - Module source code
   * @param {string} basePath - Base path for resolving relative imports
   * @returns {Promise<string>} Rewritten code
   */
  async #rewriteImports(code, basePath) {
    // Match import statements with relative paths
    // Handles: import X from './path', import './path', import { X } from './path'
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"](\.[^'"]+)['"]/g;
    
    const imports = [];
    let match;
    
    while ((match = importRegex.exec(code)) !== null) {
      imports.push({
        full: match[0],
        specifier: match[1],
        index: match.index,
      });
    }
    
    // No relative imports, return as-is
    if (imports.length === 0) {
      return code;
    }
    
    let rewritten = code;
    
    // Process imports in reverse order to preserve indices
    for (let i = imports.length - 1; i >= 0; i--) {
      const imp = imports[i];
      
      // Resolve relative path
      let resolvedPath = this.#resolvePath(basePath, imp.specifier);
      
      // Add .js extension if needed
      if (!resolvedPath.endsWith('.js')) {
        resolvedPath += '.js';
      }
      
      // Recursively create blob URL for dependency
      let depBlobUrl;
      try {
        depBlobUrl = await this.#createModuleBlobUrl(resolvedPath);
      } catch (err) {
        console.warn(`[PluginModuleLoader] Could not resolve: ${resolvedPath}`, err);
        continue;
      }
      
      // Replace the import specifier
      rewritten = rewritten.replace(imp.full, imp.full.replace(imp.specifier, depBlobUrl));
    }
    
    return rewritten;
  }

  /**
   * Resolve a relative path
   * @param {string} base - Base directory path
   * @param {string} relative - Relative path
   * @returns {string} Resolved absolute path
   */
  #resolvePath(base, relative) {
    if (relative.startsWith('./')) {
      return `${base}/${relative.slice(2)}`;
    }
    
    if (relative.startsWith('../')) {
      const parts = base.split('/').filter(Boolean);
      const relParts = relative.split('/');
      
      for (const part of relParts) {
        if (part === '..') {
          parts.pop();
        } else if (part !== '.') {
          parts.push(part);
        }
      }
      
      return '/' + parts.join('/');
    }
    
    // Absolute or bare specifier
    return relative;
  }

  /**
   * Invalidate cache for a specific path
   * @param {string} path - Path to invalidate
   */
  invalidate(path) {
    // Revoke blob URL to prevent memory leaks
    if (this.#blobCache.has(path)) {
      URL.revokeObjectURL(this.#blobCache.get(path));
      this.#blobCache.delete(path);
    }
    
    this.#moduleCache.delete(path);
    
    this.dispatchEvent(new CustomEvent('invalidated', { detail: { path } }));
  }

  /**
   * Invalidate all cached modules for a plugin
   * @param {string} pluginName - Plugin name
   */
  invalidatePlugin(pluginName) {
    const prefix = `/plugins/${pluginName}/`;
    
    for (const path of this.#blobCache.keys()) {
      if (path.startsWith(prefix)) {
        this.invalidate(path);
      }
    }
    
    this.dispatchEvent(new CustomEvent('plugin-invalidated', { detail: { pluginName } }));
  }

  /**
   * Clear all caches
   */
  clearCache() {
    // Revoke all blob URLs
    for (const url of this.#blobCache.values()) {
      URL.revokeObjectURL(url);
    }
    
    this.#blobCache.clear();
    this.#moduleCache.clear();
  }

  /**
   * Get cache statistics
   * @returns {{ blobCount: number, moduleCount: number }}
   */
  getCacheStats() {
    return {
      blobCount: this.#blobCache.size,
      moduleCount: this.#moduleCache.size,
    };
  }

  /**
   * Preload a component without executing it
   * Useful for warming the cache
   * @param {string} basePath - Component directory path
   */
  async preload(basePath) {
    const jsPath = `${basePath}/index.js`;
    await this.#createModuleBlobUrl(jsPath);
  }
}

// Export singleton
export const pluginModuleLoader = new PluginModuleLoader();

// Also export class for testing
export { PluginModuleLoader };
