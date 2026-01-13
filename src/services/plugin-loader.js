/**
 * Plugin Loader Service
 * Discovers, loads, and manages OS1 plugins
 * 
 * Follows Claude Code Plugins format with OS1 extensions
 * @see https://docs.anthropic.com/en/docs/claude-code/plugins
 * 
 * @module PluginLoader
 */

import * as agentfs from './agentfs.js';
import { skillLoader } from './skill-loader.js';
import { hooksRegistry } from './hooks-registry.js';
import { parseFrontmatter } from '../vendor/yaml-parser.js';

/**
 * @typedef {Object} Plugin
 * @property {string} name - Plugin identifier
 * @property {string} version - Semantic version
 * @property {string} description - Plugin description
 * @property {string} path - Plugin directory path
 * @property {Object} manifest - Raw plugin.json content
 * @property {Array} skills - Loaded skills
 * @property {Array} agents - Loaded agent definitions
 * @property {Array} commands - Loaded command definitions
 * @property {Array} hooks - Loaded hooks
 * @property {Array} components - Component paths
 */

class PluginLoader extends EventTarget {
  /** @type {Map<string, Plugin>} */
  #plugins = new Map();
  
  /** @type {Set<string>} */
  #enabledPlugins = new Set();
  
  /** @type {boolean} */
  #initialized = false;

  /**
   * Initialize the plugin loader
   * @param {Object} options
   * @param {boolean} [options.safeMode=false] - Skip loading plugins
   * @param {boolean} [options.loadAll=false] - Load all plugins regardless of enabled state
   * @returns {Promise<void>}
   */
  async init(options = {}) {
    if (this.#initialized) {
      console.warn('[PluginLoader] Already initialized');
      return;
    }

    // Safe mode: skip plugin loading entirely
    if (options.safeMode) {
      console.log('[PluginLoader] Safe mode - plugins disabled');
      this.#initialized = true;
      return;
    }

    await agentfs.init();
    
    // Load enabled plugins list
    await this.#loadEnabledList();

    // Discover and load plugins
    const pluginDirs = await agentfs.listPlugins();
    console.log(`[PluginLoader] Found ${pluginDirs.length} plugins`);

    for (const dir of pluginDirs) {
      // Skip disabled plugins unless loadAll is true
      if (!this.#enabledPlugins.has(dir) && !options.loadAll) {
        console.log(`[PluginLoader] Skipping disabled: ${dir}`);
        continue;
      }

      try {
        await this.loadPlugin(dir);
      } catch (err) {
        console.error(`[PluginLoader] Failed to load ${dir}:`, err);
        this.dispatchEvent(new CustomEvent('plugin-error', {
          detail: { name: dir, error: err.message },
        }));
      }
    }

    this.#initialized = true;
    this.dispatchEvent(new CustomEvent('initialized', {
      detail: { plugins: this.listPlugins() },
    }));
    
    console.log('[PluginLoader] Initialized');
  }

  /**
   * Load enabled plugins list from settings
   */
  async #loadEnabledList() {
    const config = await agentfs.getPluginsConfig();
    
    if (config.enabled && Array.isArray(config.enabled)) {
      this.#enabledPlugins = new Set(config.enabled);
    } else {
      // Default: all plugins enabled
      const all = await agentfs.listPlugins();
      this.#enabledPlugins = new Set(all);
    }
    
    // Remove explicitly disabled
    if (config.disabled && Array.isArray(config.disabled)) {
      for (const name of config.disabled) {
        this.#enabledPlugins.delete(name);
      }
    }
  }

  /**
   * Load a single plugin
   * @param {string} name - Plugin directory name
   * @returns {Promise<Plugin>}
   */
  async loadPlugin(name) {
    const pluginPath = `/plugins/${name}`;
    const manifestPath = `${pluginPath}/.claude-plugin/plugin.json`;
    
    // Read manifest
    const manifest = await agentfs.readJSON(manifestPath);
    if (!manifest) {
      throw new Error(`Missing or invalid manifest: ${manifestPath}`);
    }

    // Validate name matches directory
    if (manifest.name && manifest.name !== name) {
      console.warn(`[PluginLoader] Name mismatch: dir=${name}, manifest=${manifest.name}`);
    }

    // Build plugin object
    const plugin = {
      name: manifest.name || name,
      version: manifest.version || '0.0.0',
      description: manifest.description || '',
      path: pluginPath,
      manifest,
      skills: [],
      agents: [],
      commands: [],
      hooks: [],
      components: [],
    };

    // Load sub-resources
    const [skills, agents, commands, hooks, components] = await Promise.all([
      this.#loadSkills(name, manifest),
      this.#loadAgents(name, manifest),
      this.#loadCommands(name, manifest),
      this.#loadHooks(name, manifest),
      this.#loadComponents(name, manifest),
    ]);

    plugin.skills = skills;
    plugin.agents = agents;
    plugin.commands = commands;
    plugin.hooks = hooks;
    plugin.components = components;

    // Store plugin
    this.#plugins.set(name, plugin);

    this.dispatchEvent(new CustomEvent('plugin-loaded', { detail: plugin }));
    console.log(`[PluginLoader] Loaded: ${name} v${plugin.version}`);

    return plugin;
  }

  /**
   * Normalize a relative path from manifest (removes ./ prefix)
   */
  #normalizePath(path) {
    if (!path) return path;
    return path.replace(/^\.\//, '');
  }

  /**
   * Load skills from plugin
   */
  async #loadSkills(pluginName, manifest) {
    if (!manifest.skills) return [];
    
    const skillsPath = `/plugins/${pluginName}/${this.#normalizePath(manifest.skills)}`;
    const skills = [];

    try {
      const skillDirs = await agentfs.readdir(skillsPath);
      
      for (const skillDir of skillDirs) {
        const skillMdPath = `${skillsPath}/${skillDir}/SKILL.md`;
        
        try {
          const skill = await skillLoader.parseSkill(skillMdPath, pluginName);
          skills.push(skill);
        } catch (err) {
          console.error(`[PluginLoader] Failed to load skill ${skillDir}:`, err);
        }
      }
    } catch {
      // No skills directory
    }

    return skills;
  }

  /**
   * Load agent definitions from plugin
   */
  async #loadAgents(pluginName, manifest) {
    if (!manifest.agents) return [];
    
    const agentsPath = `/plugins/${pluginName}/${this.#normalizePath(manifest.agents)}`;
    const agents = [];

    try {
      const files = await agentfs.readdir(agentsPath);
      
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        
        try {
          const content = await agentfs.readFile(`${agentsPath}/${file}`, 'utf-8');
          const { frontmatter, body } = parseFrontmatter(content);
          
          agents.push({
            ...frontmatter,
            systemPrompt: body.trim(),
            pluginName,
          });
        } catch (err) {
          console.error(`[PluginLoader] Failed to load agent ${file}:`, err);
        }
      }
    } catch {
      // No agents directory
    }

    return agents;
  }

  /**
   * Load command definitions from plugin
   */
  async #loadCommands(pluginName, manifest) {
    if (!manifest.commands) return [];
    
    const commandsPath = `/plugins/${pluginName}/${this.#normalizePath(manifest.commands)}`;
    const commands = [];

    try {
      const files = await agentfs.readdir(commandsPath);
      
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        
        try {
          const content = await agentfs.readFile(`${commandsPath}/${file}`, 'utf-8');
          const { frontmatter, body } = parseFrontmatter(content);
          
          commands.push({
            ...frontmatter,
            body: body.trim(),
            pluginName,
          });
        } catch (err) {
          console.error(`[PluginLoader] Failed to load command ${file}:`, err);
        }
      }
    } catch {
      // No commands directory
    }

    return commands;
  }

  /**
   * Load hooks from plugin
   */
  async #loadHooks(pluginName, manifest) {
    if (!manifest.hooks) return [];
    
    const hooksPath = `/plugins/${pluginName}/${this.#normalizePath(manifest.hooks)}`;
    
    try {
      const hooksConfig = await agentfs.readJSON(hooksPath);
      const hooks = hooksConfig?.hooks || [];
      
      // Register hooks with the registry
      for (const hook of hooks) {
        hooksRegistry.register({
          ...hook,
          plugin: pluginName,
        });
      }
      
      return hooks;
    } catch {
      return [];
    }
  }

  /**
   * Load component paths from plugin
   */
  async #loadComponents(pluginName, manifest) {
    if (!manifest.components) return [];
    
    const componentsPath = `/plugins/${pluginName}/${this.#normalizePath(manifest.components)}`;
    const components = [];

    try {
      const dirs = await agentfs.readdir(componentsPath);
      
      for (const dir of dirs) {
        const indexPath = `${componentsPath}/${dir}/index.js`;
        
        if (await agentfs.exists(indexPath)) {
          components.push({
            name: dir,
            path: `${componentsPath}/${dir}`,
            pluginName,
          });
        }
      }
    } catch {
      // No components directory
    }

    return components;
  }

  /**
   * Reload a plugin
   * @param {string} name - Plugin name
   * @returns {Promise<Plugin>}
   */
  async reloadPlugin(name) {
    // Clear cached data
    this.#plugins.delete(name);
    skillLoader.invalidatePlugin(name);
    hooksRegistry.unregisterPlugin(name);
    
    // Reload
    const plugin = await this.loadPlugin(name);
    
    this.dispatchEvent(new CustomEvent('plugin-reloaded', { detail: plugin }));
    
    return plugin;
  }

  /**
   * Enable a plugin
   * @param {string} name - Plugin name
   */
  async enablePlugin(name) {
    this.#enabledPlugins.add(name);
    
    // Update config
    const config = await agentfs.getPluginsConfig();
    const enabled = Array.from(this.#enabledPlugins);
    const disabled = (config.disabled || []).filter(n => n !== name);
    await agentfs.updatePluginsConfig({ enabled, disabled });
    
    // Load if not already loaded
    if (!this.#plugins.has(name)) {
      await this.loadPlugin(name);
    }
  }

  /**
   * Disable a plugin
   * @param {string} name - Plugin name
   */
  async disablePlugin(name) {
    this.#enabledPlugins.delete(name);
    
    // Update config
    const config = await agentfs.getPluginsConfig();
    const enabled = (config.enabled || []).filter(n => n !== name);
    const disabled = [...new Set([...(config.disabled || []), name])];
    await agentfs.updatePluginsConfig({ enabled, disabled });
    
    // Unload
    this.#plugins.delete(name);
    skillLoader.invalidatePlugin(name);
    hooksRegistry.unregisterPlugin(name);
    
    this.dispatchEvent(new CustomEvent('plugin-disabled', { detail: { name } }));
  }

  /**
   * List all loaded plugins
   * @returns {string[]}
   */
  listPlugins() {
    return Array.from(this.#plugins.keys());
  }

  /**
   * Get a loaded plugin
   * @param {string} name - Plugin name
   * @returns {Plugin|undefined}
   */
  getPlugin(name) {
    return this.#plugins.get(name);
  }

  /**
   * Get all loaded plugins
   * @returns {Plugin[]}
   */
  getAllPlugins() {
    return Array.from(this.#plugins.values());
  }

  /**
   * Get all skills from all plugins
   * @returns {Array}
   */
  getAllSkills() {
    const skills = [];
    for (const plugin of this.#plugins.values()) {
      skills.push(...plugin.skills);
    }
    return skills;
  }

  /**
   * Get all commands from all plugins
   * @returns {Array}
   */
  getAllCommands() {
    const commands = [];
    for (const plugin of this.#plugins.values()) {
      commands.push(...plugin.commands);
    }
    return commands;
  }

  /**
   * Get all agents from all plugins
   * @returns {Array}
   */
  getAllAgents() {
    const agents = [];
    for (const plugin of this.#plugins.values()) {
      agents.push(...plugin.agents);
    }
    return agents;
  }

  /**
   * Check if plugins are initialized
   * @returns {boolean}
   */
  get isInitialized() {
    return this.#initialized;
  }

  /**
   * Check if a plugin is enabled
   * @param {string} name - Plugin name
   * @returns {boolean}
   */
  isEnabled(name) {
    return this.#enabledPlugins.has(name);
  }
}

// Export singleton
export const pluginLoader = new PluginLoader();

// Also export class for testing
export { PluginLoader };
