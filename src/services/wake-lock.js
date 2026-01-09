/**
 * Wake Lock Service
 * Keeps device screen awake while app is open
 */

class WakeLockService {
  #wakeLock = null;
  #isInitialized = false;

  /**
   * Check if Wake Lock API is supported
   * @returns {boolean}
   */
  get isSupported() {
    return 'wakeLock' in navigator;
  }

  /**
   * Initialize persistent wake lock
   * Re-acquires lock when page becomes visible
   */
  init() {
    if (this.#isInitialized || !this.isSupported) return;
    
    this.#isInitialized = true;
    
    // Acquire lock on init
    this.#acquire();
    
    // Re-acquire when page becomes visible again
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.#acquire();
      }
    });
    
    console.log('[WakeLock] Persistent mode initialized');
  }

  /**
   * Request a wake lock
   * @returns {Promise<boolean>} True if lock acquired
   */
  async request() {
    return this.#acquire();
  }

  /**
   * Internal acquire method
   * @returns {Promise<boolean>}
   */
  async #acquire() {
    if (!this.isSupported || this.#wakeLock) return !!this.#wakeLock;

    try {
      this.#wakeLock = await navigator.wakeLock.request('screen');
      
      this.#wakeLock.addEventListener('release', () => {
        this.#wakeLock = null;
      });

      console.log('[WakeLock] Screen wake lock acquired');
      return true;
    } catch (err) {
      // Don't warn for visibility errors - expected when page not visible
      if (!err.message.includes('not visible')) {
        console.warn('[WakeLock] Failed to acquire:', err.message);
      }
      return false;
    }
  }

  /**
   * Release the wake lock (for cleanup if needed)
   * @returns {Promise<void>}
   */
  async release() {
    if (this.#wakeLock) {
      await this.#wakeLock.release();
      this.#wakeLock = null;
    }
  }

  /**
   * Check if wake lock is currently held
   * @returns {boolean}
   */
  get isLocked() {
    return this.#wakeLock !== null;
  }
}

export const wakeLockService = new WakeLockService();
export default wakeLockService;
