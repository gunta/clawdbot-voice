/**
 * App Context Service
 * Manages shared state between apps, navigation history, and inter-app communication
 * 
 * This is the foundation for the "interconnected apps" paradigm where apps are not
 * isolated silos but nodes in a flowing story/experience.
 */

/**
 * @typedef {Object} AppState
 * @property {string} id - App identifier
 * @property {Object} state - App-specific state
 * @property {number} timestamp - When the state was set
 */

/**
 * @typedef {Object} HistoryEntry
 * @property {string} appId - App that was active
 * @property {string} action - What happened
 * @property {Object} [data] - Associated data
 * @property {number} timestamp - When it happened
 */

class AppContext extends EventTarget {
  /** @type {Map<string, AppState>} */
  #appStates = new Map();
  
  /** @type {HistoryEntry[]} */
  #history = [];
  
  /** @type {string|null} */
  #activeApp = null;
  
  /** @type {number} */
  #maxHistoryLength = 100;

  constructor() {
    super();
    console.log('[AppContext] Initialized');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // App State Management
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Set state for an app
   * @param {string} appId - App identifier
   * @param {Object} state - State to set (merged with existing)
   */
  setState(appId, state) {
    const existing = this.#appStates.get(appId);
    const newState = {
      id: appId,
      state: existing ? { ...existing.state, ...state } : state,
      timestamp: Date.now()
    };
    
    this.#appStates.set(appId, newState);
    
    this.dispatchEvent(new CustomEvent('state-change', {
      detail: { appId, state: newState.state }
    }));
  }

  /**
   * Get state for an app
   * @param {string} appId - App identifier
   * @returns {Object|null}
   */
  getState(appId) {
    return this.#appStates.get(appId)?.state ?? null;
  }

  /**
   * Clear state for an app
   * @param {string} appId - App identifier
   */
  clearState(appId) {
    this.#appStates.delete(appId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Active App Management
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Set the active app
   * @param {string} appId - App identifier
   */
  setActiveApp(appId) {
    const previousApp = this.#activeApp;
    this.#activeApp = appId;
    
    this.#addToHistory(appId, 'activate');
    
    this.dispatchEvent(new CustomEvent('active-app-change', {
      detail: { appId, previousApp }
    }));
  }

  /**
   * Get the active app
   * @returns {string|null}
   */
  getActiveApp() {
    return this.#activeApp;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Navigation History
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Add entry to history
   * @param {string} appId - App identifier
   * @param {string} action - Action performed
   * @param {Object} [data] - Additional data
   */
  #addToHistory(appId, action, data = {}) {
    this.#history.push({
      appId,
      action,
      data,
      timestamp: Date.now()
    });
    
    // Trim history if too long
    if (this.#history.length > this.#maxHistoryLength) {
      this.#history = this.#history.slice(-this.#maxHistoryLength);
    }
  }

  /**
   * Record a navigation action
   * @param {string} appId - App identifier
   * @param {string} action - Navigation action (e.g., 'navigate', 'open-file')
   * @param {Object} [data] - Additional data
   */
  recordAction(appId, action, data = {}) {
    this.#addToHistory(appId, action, data);
    
    this.dispatchEvent(new CustomEvent('action', {
      detail: { appId, action, data }
    }));
  }

  /**
   * Get navigation history
   * @param {number} [limit] - Max entries to return
   * @returns {HistoryEntry[]}
   */
  getHistory(limit) {
    if (limit) {
      return this.#history.slice(-limit);
    }
    return [...this.#history];
  }

  /**
   * Get history for a specific app
   * @param {string} appId - App identifier
   * @param {number} [limit] - Max entries to return
   * @returns {HistoryEntry[]}
   */
  getAppHistory(appId, limit) {
    const appHistory = this.#history.filter(h => h.appId === appId);
    if (limit) {
      return appHistory.slice(-limit);
    }
    return appHistory;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Inter-App Communication
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Send a message to another app
   * @param {string} fromApp - Sending app
   * @param {string} toApp - Receiving app
   * @param {string} type - Message type
   * @param {Object} [payload] - Message payload
   */
  sendMessage(fromApp, toApp, type, payload = {}) {
    this.dispatchEvent(new CustomEvent('app-message', {
      detail: { fromApp, toApp, type, payload, timestamp: Date.now() }
    }));
  }

  /**
   * Broadcast a message to all apps
   * @param {string} fromApp - Sending app
   * @param {string} type - Message type
   * @param {Object} [payload] - Message payload
   */
  broadcast(fromApp, type, payload = {}) {
    this.dispatchEvent(new CustomEvent('app-broadcast', {
      detail: { fromApp, type, payload, timestamp: Date.now() }
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Story/Flow State (for connected experience)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the "story" - a narrative of what the user has been doing
   * Useful for contextual AI assistance or time-travel features
   * @param {number} [windowMs=300000] - Time window in ms (default 5 min)
   * @returns {Object}
   */
  getStory(windowMs = 300000) {
    const now = Date.now();
    const cutoff = now - windowMs;
    
    const recentHistory = this.#history.filter(h => h.timestamp > cutoff);
    const appsUsed = [...new Set(recentHistory.map(h => h.appId))];
    const actions = recentHistory.map(h => `${h.appId}:${h.action}`);
    
    return {
      timeWindow: windowMs,
      appsUsed,
      actionCount: recentHistory.length,
      actions,
      currentApp: this.#activeApp,
      summary: this.#generateStorySummary(recentHistory)
    };
  }

  /**
   * Generate a human-readable summary of recent activity
   * @param {HistoryEntry[]} history
   * @returns {string}
   */
  #generateStorySummary(history) {
    if (history.length === 0) {
      return 'No recent activity';
    }
    
    const appCounts = {};
    history.forEach(h => {
      appCounts[h.appId] = (appCounts[h.appId] || 0) + 1;
    });
    
    const parts = Object.entries(appCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([app, count]) => `${app} (${count} actions)`)
      .slice(0, 3);
    
    return `Recent activity: ${parts.join(', ')}`;
  }
}

// Export singleton instance
export const appContext = new AppContext();

// Also export class for testing
export { AppContext };
