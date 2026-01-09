/**
 * Wake Lock Service
 * Prevents device screen from sleeping during playback
 */

class WakeLockService {
  #wakeLock = null;

  /**
   * Check if Wake Lock API is supported
   * @returns {boolean}
   */
  get isSupported() {
    return 'wakeLock' in navigator;
  }

  /**
   * Request a wake lock
   * @returns {Promise<boolean>} True if lock acquired
   */
  async request() {
    if (!this.isSupported) return false;

    try {
      this.#wakeLock = await navigator.wakeLock.request('screen');
      
      this.#wakeLock.addEventListener('release', () => {
        this.#wakeLock = null;
      });

      return true;
    } catch (err) {
      console.warn('[WakeLock] Failed to acquire:', err.message);
      return false;
    }
  }

  /**
   * Release the wake lock
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
