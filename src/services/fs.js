/**
 * Unified Filesystem Service
 * Routes between AgentFS and /connections based on path prefix
 * 
 * This module is re-exported as 'agentfs' from services/index.js
 * so existing imports continue to work with zero changes.
 * 
 * Paths starting with /connections/ → connections-fs.js (local files)
 * All other paths → agentfs.js (SQLite WASM storage)
 */

import * as agentfsCore from './agentfs.js';
import * as connectionsFs from './connections-fs.js';

// ─────────────────────────────────────────────────────────────────────────────
// Path Routing
// ─────────────────────────────────────────────────────────────────────────────

const CONNECTIONS_PREFIX = '/connections';

/**
 * Check if path is under /connections
 * @param {string} path
 * @returns {boolean}
 */
export function isConnectionPath(path) {
  return connectionsFs.isConnectionPath(path);
}

/**
 * Check if File System Access API is supported
 * @returns {boolean}
 */
export function isConnectionsSupported() {
  return connectionsFs.isSupported();
}

// ─────────────────────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initialize the filesystem
 */
export async function init() {
  return agentfsCore.init();
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Filesystem Operations (routed)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read file contents
 * @param {string} path
 * @param {string} [encoding]
 * @returns {Promise<string|ArrayBuffer|Buffer|null>}
 */
export async function readFile(path, encoding) {
  if (isConnectionPath(path)) {
    if (!isConnectionsSupported()) {
      throw new Error('Connected folders are not supported in this browser');
    }
    return connectionsFs.readFile(path, encoding);
  }
  return agentfsCore.readFile(path, encoding);
}

/**
 * Write file contents
 * @param {string} path
 * @param {string|ArrayBuffer|Uint8Array} data
 */
export async function writeFile(path, data) {
  if (isConnectionPath(path)) {
    if (!isConnectionsSupported()) {
      throw new Error('Connected folders are not supported in this browser');
    }
    return connectionsFs.writeFile(path, data);
  }
  return agentfsCore.writeFile(path, data);
}

/**
 * List directory contents
 * @param {string} path
 * @returns {Promise<string[]>}
 */
export async function readdir(path) {
  // Special handling for root: include 'connections' in the list (only if supported)
  if (path === '/' || path === '') {
    const coreEntries = await agentfsCore.readdir('/');
    // Add 'connections' if not already present and File System Access API is supported
    if (isConnectionsSupported() && !coreEntries.includes('connections')) {
      return [...coreEntries, 'connections'].sort();
    }
    // Filter out 'connections' if the API is not supported (shouldn't exist anyway)
    if (!isConnectionsSupported()) {
      return coreEntries.filter(e => e !== 'connections');
    }
    return coreEntries;
  }
  
  // Block /connections paths if not supported
  if (isConnectionPath(path)) {
    if (!isConnectionsSupported()) {
      throw new Error('Connected folders are not supported in this browser');
    }
    return connectionsFs.readdir(path);
  }
  return agentfsCore.readdir(path);
}

/**
 * Check if path exists
 * @param {string} path
 * @returns {Promise<boolean>}
 */
export async function exists(path) {
  if (isConnectionPath(path)) {
    return connectionsFs.exists(path);
  }
  return agentfsCore.exists(path);
}

/**
 * Get file/directory stats
 * @param {string} path
 * @returns {Promise<{isFile: Function, isDirectory: Function, size?: number, mtime?: number}>}
 */
export async function stat(path) {
  if (isConnectionPath(path)) {
    return connectionsFs.stat(path);
  }
  
  // For AgentFS, we need to use the agent's fs.stat
  await agentfsCore.init();
  const agent = await agentfsCore.getAgent();
  return agent.fs.stat(path);
}

/**
 * Create directory
 * @param {string} path
 */
export async function mkdir(path) {
  if (isConnectionPath(path)) {
    return connectionsFs.mkdir(path);
  }
  return agentfsCore.mkdir(path);
}

/**
 * Delete file
 * @param {string} path
 */
export async function deleteFile(path) {
  if (isConnectionPath(path)) {
    return connectionsFs.deleteFile(path);
  }
  return agentfsCore.deleteFile(path);
}

/**
 * Remove directory
 * @param {string} path
 * @param {Object} [options]
 */
export async function rmdir(path, options) {
  if (isConnectionPath(path)) {
    return connectionsFs.rmdir(path, options);
  }
  // AgentFS doesn't have rmdir, use the agent directly
  await agentfsCore.init();
  const agent = await agentfsCore.getAgent();
  return agent.fs.rmdir(path);
}

/**
 * Read JSON file
 * @param {string} path
 * @returns {Promise<any|null>}
 */
export async function readJSON(path) {
  if (isConnectionPath(path)) {
    return connectionsFs.readJSON(path);
  }
  return agentfsCore.readJSON(path);
}

/**
 * Write JSON file
 * @param {string} path
 * @param {any} data
 */
export async function writeJSON(path, data) {
  if (isConnectionPath(path)) {
    return connectionsFs.writeJSON(path, data);
  }
  return agentfsCore.writeJSON(path, data);
}

// ─────────────────────────────────────────────────────────────────────────────
// Connections Management (new API surface)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Connect a folder via the directory picker
 * @param {string} [suggestedName]
 * @returns {Promise<{id: string, name: string, mountPoint: string}|null>}
 */
export async function connectFolder(suggestedName) {
  return connectionsFs.connectFolder(suggestedName);
}

/**
 * Connect a directory handle (from drag/drop)
 * @param {FileSystemDirectoryHandle} handle
 * @param {string} [suggestedName]
 * @returns {Promise<{id: string, name: string, mountPoint: string}>}
 */
export async function connectDirectoryHandle(handle, suggestedName) {
  return connectionsFs.connectDirectoryHandle(handle, suggestedName);
}

/**
 * Connect a file handle (from drag/drop for direct editing)
 * @param {FileSystemFileHandle} handle
 * @param {string} [suggestedName]
 * @returns {Promise<{id: string, name: string, mountPoint: string}>}
 */
export async function connectFileHandle(handle, suggestedName) {
  return connectionsFs.connectFileHandle(handle, suggestedName);
}

/**
 * Disconnect a mount
 * @param {string} id - Mount ID
 */
export async function disconnectConnection(id) {
  return connectionsFs.disconnect(id);
}

/**
 * List all connections with permission status
 * @returns {Promise<Array>}
 */
export async function listConnections() {
  return connectionsFs.listMounts();
}

/**
 * Rename a connection
 * @param {string} id
 * @param {string} newName
 */
export async function renameConnection(id, newName) {
  return connectionsFs.renameMount(id, newName);
}

/**
 * Request permission for a connection
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function requestConnectionPermission(id) {
  return connectionsFs.requestMountPermission(id);
}

/**
 * Check if handles can be obtained from drag/drop
 * @returns {boolean}
 */
export function supportsHandleFromDrop() {
  return connectionsFs.supportsHandleFromDrop();
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export AgentFS-specific APIs (for backwards compatibility)
// ─────────────────────────────────────────────────────────────────────────────

// Config & User helpers
export const getConfig = agentfsCore.getConfig;
export const updateConfig = agentfsCore.updateConfig;
export const getUser = agentfsCore.getUser;
export const updateUser = agentfsCore.updateUser;
export const isReturningUser = agentfsCore.isReturningUser;
export const getDaysSinceFirstUsage = agentfsCore.getDaysSinceFirstUsage;

// KV Store
export const kvGet = agentfsCore.kvGet;
export const kvSet = agentfsCore.kvSet;
export const kvDelete = agentfsCore.kvDelete;
export const kvList = agentfsCore.kvList;

// Plugin helpers
export const listPlugins = agentfsCore.listPlugins;
export const readPluginManifest = agentfsCore.readPluginManifest;
export const getPluginsConfig = agentfsCore.getPluginsConfig;
export const updatePluginsConfig = agentfsCore.updatePluginsConfig;
export const createPlugin = agentfsCore.createPlugin;

// Constants
export const DEFAULT_CONFIG = agentfsCore.DEFAULT_CONFIG;
export const PATHS = agentfsCore.PATHS;
export const getPaths = agentfsCore.getPaths;

// Raw agent access (use sparingly)
export const getAgent = agentfsCore.getAgent;

// ─────────────────────────────────────────────────────────────────────────────
// Extended Operations (for Commands app compatibility)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Remove file or directory
 * @param {string} path
 * @param {Object} [options]
 * @param {boolean} [options.recursive]
 * @param {boolean} [options.force]
 */
export async function rm(path, options = {}) {
  if (isConnectionPath(path)) {
    if (!isConnectionsSupported()) {
      throw new Error('Connected folders are not supported in this browser');
    }
    // For connections, use deleteFile or rmdir based on type
    const stats = await connectionsFs.stat(path);
    if (stats.isDirectory()) {
      return connectionsFs.rmdir(path, options);
    }
    return connectionsFs.deleteFile(path);
  }
  
  await agentfsCore.init();
  const agent = await agentfsCore.getAgent();
  return agent.fs.rm(path, options);
}

/**
 * Copy a file
 * @param {string} src - Source path
 * @param {string} dest - Destination path
 */
export async function copyFile(src, dest) {
  // Read from source (handles /connections)
  const content = await readFile(src);
  // Write to destination (handles /connections)
  await writeFile(dest, content);
}

/**
 * Rename/move a file or directory
 * @param {string} oldPath
 * @param {string} newPath
 */
export async function rename(oldPath, newPath) {
  // For cross-filesystem moves, copy then delete
  const srcIsConnection = isConnectionPath(oldPath);
  const destIsConnection = isConnectionPath(newPath);
  
  if (srcIsConnection || destIsConnection) {
    // Copy content
    const content = await readFile(oldPath);
    await writeFile(newPath, content);
    // Delete original
    await deleteFile(oldPath);
    return;
  }
  
  // Same filesystem, use native rename
  await agentfsCore.init();
  const agent = await agentfsCore.getAgent();
  return agent.fs.rename(oldPath, newPath);
}

/**
 * List directory with extended stats (like ls -l)
 * @param {string} path
 * @returns {Promise<Array<{name: string, stats: {isDirectory: Function, isFile: Function, size: number, mtime: number}}>>}
 */
export async function readdirPlus(path) {
  // Special handling for root: include 'connections' in the list
  if (path === '/' || path === '') {
    await agentfsCore.init();
    const agent = await agentfsCore.getAgent();
    const coreEntries = await agent.fs.readdirPlus('/');
    
    // Add 'connections' virtual directory if supported and not already present
    if (isConnectionsSupported() && !coreEntries.some(e => e.name === 'connections')) {
      coreEntries.push({
        name: 'connections',
        stats: {
          isDirectory: () => true,
          isFile: () => false,
          size: 0,
          mtime: Date.now()
        }
      });
      // Sort by name
      coreEntries.sort((a, b) => a.name.localeCompare(b.name));
    }
    return coreEntries;
  }
  
  if (isConnectionPath(path)) {
    if (!isConnectionsSupported()) {
      throw new Error('Connected folders are not supported in this browser');
    }
    // Get entries and stats for each
    const entries = await connectionsFs.readdir(path);
    const results = await Promise.all(
      entries.map(async (name) => {
        const fullPath = path.endsWith('/') ? `${path}${name}` : `${path}/${name}`;
        try {
          const stats = await connectionsFs.stat(fullPath);
          return { name, stats };
        } catch {
          // If stat fails, return basic info
          return {
            name,
            stats: {
              isDirectory: () => false,
              isFile: () => true,
              size: 0,
              mtime: Date.now()
            }
          };
        }
      })
    );
    return results;
  }
  
  // Use AgentFS's native readdirPlus
  await agentfsCore.init();
  const agent = await agentfsCore.getAgent();
  return agent.fs.readdirPlus(path);
}
