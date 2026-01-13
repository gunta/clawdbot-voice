/**
 * Agent Tools API
 * Structured operations for external AI agents
 * 
 * This API provides a consistent interface for AI agents to interact with OS1,
 * following the Vercel "agents with filesystems" pattern.
 * 
 * @see https://vercel.com/blog/how-to-build-agents-with-filesystems-and-bash
 * @module AgentTools
 */

import * as agentfs from './agentfs.js';
import { navigationService } from './navigation-service.js';
import { appContext } from './app-context.js';
import { pluginLoader } from './plugin-loader.js';
import { skillLoader } from './skill-loader.js';
import { hooksRegistry } from './hooks-registry.js';

// Lazy imports for optional services (may not be initialized)
let speechSynthesis = null;
let speechRecognition = null;

/**
 * Initialize optional voice services
 * Call this after speech services are available
 */
export function initVoiceServices(synthesis, recognition) {
  speechSynthesis = synthesis;
  speechRecognition = recognition;
}

/**
 * Agent Tools API
 * 
 * Usage:
 *   window.os1.tools.fs.read('/path/to/file');
 *   window.os1.tools.nav.open('files', { path: '/documents' });
 *   window.os1.tools.voice.speak('Hello!');
 */
export const agentTools = {
  // ─────────────────────────────────────────────────────────────────────────
  // Filesystem (bash-like semantics)
  // ─────────────────────────────────────────────────────────────────────────
  fs: {
    /**
     * Read file contents
     * @param {string} path - File path
     * @returns {Promise<string|null>}
     */
    read: (path) => agentfs.readFile(path, 'utf-8'),
    
    /**
     * Write file contents
     * @param {string} path - File path
     * @param {string} content - Content to write
     */
    write: (path, content) => agentfs.writeFile(path, content),
    
    /**
     * List directory contents
     * @param {string} path - Directory path
     * @returns {Promise<string[]>}
     */
    list: (path) => agentfs.readdir(path),
    
    /**
     * Check if path exists
     * @param {string} path - Path to check
     * @returns {Promise<boolean>}
     */
    exists: (path) => agentfs.exists(path),
    
    /**
     * Delete a file
     * @param {string} path - File path
     */
    delete: (path) => agentfs.deleteFile(path),
    
    /**
     * Create a directory
     * @param {string} path - Directory path
     */
    mkdir: (path) => agentfs.mkdir(path),
    
    /**
     * Read JSON file
     * @param {string} path - File path
     * @returns {Promise<any|null>}
     */
    readJson: (path) => agentfs.readJSON(path),
    
    /**
     * Write JSON file
     * @param {string} path - File path
     * @param {any} data - Data to write
     */
    writeJson: (path, data) => agentfs.writeJSON(path, data),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Navigation (voice-natural semantics)
  // ─────────────────────────────────────────────────────────────────────────
  nav: {
    /**
     * Open an app
     * @param {string} app - App identifier
     * @param {Object} [state] - Initial state
     */
    open: (app, state) => navigationService.push(app, app, state),
    
    /**
     * Go back
     * @returns {boolean} Whether navigation occurred
     */
    back: () => navigationService.back(),
    
    /**
     * Go forward
     * @returns {boolean} Whether navigation occurred
     */
    forward: () => navigationService.forward(),
    
    /**
     * Close current app
     */
    close: () => navigationService.close(),
    
    /**
     * Present a modal
     * @param {string} modal - Modal identifier
     * @param {Object} [state] - Initial state
     */
    present: (modal, state) => navigationService.present(modal, state),
    
    /**
     * Dismiss current modal
     * @returns {boolean} Whether a modal was dismissed
     */
    dismiss: () => navigationService.dismiss(),
    
    /**
     * Get current app
     * @returns {Object|null}
     */
    current: () => navigationService.current,
    
    /**
     * Get navigation history
     * @returns {Object}
     */
    history: () => navigationService.getHistory(),
    
    /**
     * Check if can go back
     * @returns {boolean}
     */
    canGoBack: () => navigationService.canGoBack,
    
    /**
     * Check if can go forward
     * @returns {boolean}
     */
    canGoForward: () => navigationService.canGoForward,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Voice (OS1 unique capability)
  // ─────────────────────────────────────────────────────────────────────────
  voice: {
    /**
     * Speak text
     * @param {string} text - Text to speak
     * @param {Object} [options] - Speech options
     */
    speak: (text, options) => {
      if (speechSynthesis) {
        return speechSynthesis.speak(text, options);
      }
      console.warn('[AgentTools] Speech synthesis not available');
    },
    
    /**
     * Start listening
     */
    listen: () => {
      if (speechRecognition) {
        return speechRecognition.start();
      }
      console.warn('[AgentTools] Speech recognition not available');
    },
    
    /**
     * Stop all voice activity
     */
    stop: () => {
      if (speechSynthesis) {
        speechSynthesis.cancel();
      }
      if (speechRecognition) {
        speechRecognition.stop();
      }
    },
    
    /**
     * Check if speech synthesis is available
     * @returns {boolean}
     */
    canSpeak: () => !!speechSynthesis,
    
    /**
     * Check if speech recognition is available
     * @returns {boolean}
     */
    canListen: () => !!speechRecognition,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Plugins
  // ─────────────────────────────────────────────────────────────────────────
  plugin: {
    /**
     * List loaded plugins
     * @returns {string[]}
     */
    list: () => pluginLoader.listPlugins(),
    
    /**
     * Get a plugin
     * @param {string} name - Plugin name
     * @returns {Object|undefined}
     */
    get: (name) => pluginLoader.getPlugin(name),
    
    /**
     * Reload a plugin
     * @param {string} name - Plugin name
     */
    reload: (name) => pluginLoader.reloadPlugin(name),
    
    /**
     * Enable a plugin
     * @param {string} name - Plugin name
     */
    enable: (name) => pluginLoader.enablePlugin(name),
    
    /**
     * Disable a plugin
     * @param {string} name - Plugin name
     */
    disable: (name) => pluginLoader.disablePlugin(name),
    
    /**
     * Check if plugin is enabled
     * @param {string} name - Plugin name
     * @returns {boolean}
     */
    isEnabled: (name) => pluginLoader.isEnabled(name),
    
    /**
     * Get all plugins
     * @returns {Array}
     */
    getAll: () => pluginLoader.getAllPlugins(),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Skills (agentskills.io)
  // ─────────────────────────────────────────────────────────────────────────
  skill: {
    /**
     * List all skills
     * @returns {Array}
     */
    list: () => pluginLoader.getAllSkills(),
    
    /**
     * Get a skill by name
     * @param {string} name - Skill name
     * @returns {Object|null}
     */
    get: (name) => skillLoader.getSkillByName(name),
    
    /**
     * Get skill content for agent context
     * @param {string} name - Skill name
     * @param {boolean} [includeRefs=false] - Include references
     * @returns {Promise<Object|null>}
     */
    getContent: (name, includeRefs = false) => skillLoader.getSkillContent(name, includeRefs),
    
    /**
     * Load skill references
     * @param {string} name - Skill name
     * @returns {Promise<Object>}
     */
    getReferences: async (name) => {
      const skill = skillLoader.getSkillByName(name);
      if (!skill) return {};
      return skillLoader.loadReferences(skill);
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Hooks
  // ─────────────────────────────────────────────────────────────────────────
  hook: {
    /**
     * Fire an event
     * @param {string} event - Event type
     * @param {Object} [data] - Event data
     */
    fire: (event, data) => hooksRegistry.fire(event, data),
    
    /**
     * Get all hooks
     * @returns {Array}
     */
    list: () => hooksRegistry.getHooks(),
    
    /**
     * Get hooks for a specific event
     * @param {string} event - Event type
     * @returns {Array}
     */
    getByEvent: (event) => hooksRegistry.getEventHooks(event),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Context (for agents to understand state)
  // ─────────────────────────────────────────────────────────────────────────
  context: {
    /**
     * Get current app
     * @returns {Object|null}
     */
    getCurrentApp: () => navigationService.current,
    
    /**
     * Get navigation history
     * @param {number} [limit=20] - Max entries
     * @returns {Array}
     */
    getHistory: (limit = 20) => appContext.getHistory(limit),
    
    /**
     * Get story (narrative of recent activity)
     * @param {number} [windowMs=300000] - Time window (default 5 min)
     * @returns {Object}
     */
    getStory: (windowMs = 300000) => appContext.getStory(windowMs),
    
    /**
     * Get list of active plugins
     * @returns {string[]}
     */
    getActivePlugins: () => pluginLoader.listPlugins(),
    
    /**
     * Get state for an app
     * @param {string} appId - App identifier
     * @returns {Object|null}
     */
    getAppState: (appId) => appContext.getState(appId),
    
    /**
     * Get all available commands
     * @returns {Array}
     */
    getCommands: () => pluginLoader.getAllCommands(),
    
    /**
     * Get all available agents
     * @returns {Array}
     */
    getAgents: () => pluginLoader.getAllAgents(),
  },
};

/**
 * Expose tools globally for agents
 */
export function exposeGlobally() {
  if (typeof window !== 'undefined') {
    window.os1 = window.os1 || {};
    window.os1.tools = agentTools;
    console.log('[AgentTools] Exposed at window.os1.tools');
  }
}

// Auto-expose on import
exposeGlobally();

export default agentTools;
