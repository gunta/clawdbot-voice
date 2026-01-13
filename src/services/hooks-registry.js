/**
 * Hooks Registry Service
 * Manages event hooks for plugins
 * 
 * Supported events:
 * - on-navigate: Fires when navigating to an app
 * - on-time: Fires at specific times
 * - on-voice: Fires when specific phrases are spoken
 * - on-file-change: Fires when files change
 * - on-boot: Fires when OS1 starts
 * 
 * @module HooksRegistry
 */

import { navigationService } from './navigation-service.js';

/**
 * @typedef {Object} Hook
 * @property {string} event - Event type
 * @property {Object} config - Event configuration
 * @property {string} action - Action to execute
 * @property {string} plugin - Parent plugin name
 */

class HooksRegistry extends EventTarget {
  /** @type {Hook[]} */
  #hooks = [];
  
  /** @type {Map<string, number>} */
  #timers = new Map();
  
  /** @type {boolean} */
  #initialized = false;

  /**
   * Register a hook
   * @param {Hook} hook - Hook definition
   */
  register(hook) {
    this.#hooks.push(hook);
    
    // Set up time-based hooks
    if (hook.event === 'on-time' && hook.config?.time) {
      this.#setupTimeHook(hook);
    }
    
    console.log(`[HooksRegistry] Registered: ${hook.event} -> ${hook.action} (${hook.plugin})`);
  }

  /**
   * Unregister all hooks for a plugin
   * @param {string} pluginName - Plugin name
   */
  unregisterPlugin(pluginName) {
    // Remove hooks
    this.#hooks = this.#hooks.filter(h => h.plugin !== pluginName);
    
    // Clear timers for this plugin
    for (const [key, timer] of this.#timers.entries()) {
      if (key.startsWith(`${pluginName}:`)) {
        clearInterval(timer);
        this.#timers.delete(key);
      }
    }
    
    console.log(`[HooksRegistry] Unregistered all hooks for: ${pluginName}`);
  }

  /**
   * Fire an event
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  fire(event, data = {}) {
    const matching = this.#hooks.filter(h => h.event === event);
    
    for (const hook of matching) {
      if (this.#matchesConfig(hook.config, data)) {
        this.#executeAction(hook);
      }
    }
  }

  /**
   * Check if hook config matches event data
   */
  #matchesConfig(config, data) {
    if (!config) return true;
    
    for (const [key, value] of Object.entries(config)) {
      // Skip time config (handled separately)
      if (key === 'time') continue;
      
      if (data[key] !== value) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Execute a hook action
   * @param {Hook} hook - Hook to execute
   */
  #executeAction(hook) {
    const [type, ...rest] = hook.action.split(':');
    const name = rest.join(':');
    
    console.log(`[HooksRegistry] Executing: ${hook.action} (${hook.plugin})`);
    
    // Dispatch action event for handlers to process
    this.dispatchEvent(new CustomEvent('action', {
      detail: {
        type,
        name,
        plugin: hook.plugin,
        hook,
      },
    }));
    
    // Built-in action handlers
    switch (type) {
      case 'command':
        this.dispatchEvent(new CustomEvent('execute-command', {
          detail: { name, plugin: hook.plugin },
        }));
        break;
        
      case 'skill':
        this.dispatchEvent(new CustomEvent('activate-skill', {
          detail: { name, plugin: hook.plugin },
        }));
        break;
        
      case 'component':
        const [action, componentName] = name.split(':');
        this.dispatchEvent(new CustomEvent('component-action', {
          detail: { action, name: componentName, plugin: hook.plugin },
        }));
        break;
    }
  }

  /**
   * Set up a time-based hook
   * @param {Hook} hook - Hook with on-time event
   */
  #setupTimeHook(hook) {
    const { time } = hook.config;
    const [hours, minutes] = time.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) {
      console.error(`[HooksRegistry] Invalid time format: ${time}`);
      return;
    }
    
    const key = `${hook.plugin}:${hook.event}:${time}`;
    
    // Clear existing timer if any
    if (this.#timers.has(key)) {
      clearInterval(this.#timers.get(key));
    }
    
    // Check every minute
    const timer = setInterval(() => {
      const now = new Date();
      if (now.getHours() === hours && now.getMinutes() === minutes) {
        // Only fire once per minute (check seconds)
        if (now.getSeconds() < 60) {
          this.#executeAction(hook);
        }
      }
    }, 60000);
    
    this.#timers.set(key, timer);
    
    // Also check immediately if it's the right time
    const now = new Date();
    if (now.getHours() === hours && now.getMinutes() === minutes) {
      this.#executeAction(hook);
    }
  }

  /**
   * Initialize the hooks registry
   * Wires up event listeners
   */
  init() {
    if (this.#initialized) {
      return;
    }
    
    // Wire up navigation hooks
    navigationService.addEventListener('window-change', (e) => {
      this.fire('on-navigate', {
        app: e.detail.window?.id,
        direction: e.detail.direction,
      });
    });
    
    // Fire boot hook
    setTimeout(() => {
      this.fire('on-boot', {});
    }, 100);
    
    this.#initialized = true;
    console.log('[HooksRegistry] Initialized');
  }

  /**
   * Get all registered hooks
   * @returns {Hook[]}
   */
  getHooks() {
    return [...this.#hooks];
  }

  /**
   * Get hooks for a specific plugin
   * @param {string} pluginName - Plugin name
   * @returns {Hook[]}
   */
  getPluginHooks(pluginName) {
    return this.#hooks.filter(h => h.plugin === pluginName);
  }

  /**
   * Get hooks for a specific event type
   * @param {string} event - Event type
   * @returns {Hook[]}
   */
  getEventHooks(event) {
    return this.#hooks.filter(h => h.event === event);
  }

  /**
   * Check if registry is initialized
   * @returns {boolean}
   */
  get isInitialized() {
    return this.#initialized;
  }

  /**
   * Clean up (for testing)
   */
  destroy() {
    // Clear all timers
    for (const timer of this.#timers.values()) {
      clearInterval(timer);
    }
    this.#timers.clear();
    this.#hooks = [];
    this.#initialized = false;
  }
}

// Export singleton
export const hooksRegistry = new HooksRegistry();

// Also export class for testing
export { HooksRegistry };
