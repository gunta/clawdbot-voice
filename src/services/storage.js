/**
 * Storage Service
 * Persistent storage for user preferences and state
 */

const STORAGE_PREFIX = 'clawd_';

/**
 * Get value from storage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if not found
 * @returns {*}
 */
export function get(key, defaultValue = null) {
  try {
    const value = localStorage.getItem(STORAGE_PREFIX + key);
    return value !== null ? JSON.parse(value) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Set value in storage
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 */
export function set(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.warn('[Storage] Failed to save:', err);
  }
}

/**
 * Remove value from storage
 * @param {string} key - Storage key
 */
export function remove(key) {
  localStorage.removeItem(STORAGE_PREFIX + key);
}

/**
 * Check if enough time has passed since last visit
 * @param {number} hours - Hours threshold
 * @returns {boolean}
 */
export function isReturningUser(hours = 2) {
  const lastVisit = get('last_visit');
  const now = Date.now();

  set('last_visit', now);

  if (!lastVisit) return false;
  
  const hoursSince = (now - lastVisit) / (1000 * 60 * 60);
  return hoursSince > hours;
}

export default { get, set, remove, isReturningUser };
