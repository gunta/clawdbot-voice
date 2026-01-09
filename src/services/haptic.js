/**
 * Haptic Feedback Service
 * Provides tactile feedback for native-like interactions
 */

const HAPTIC_PATTERNS = {
  light: [10],
  medium: [30],
  double: [20, 50, 20],
  success: [10, 50, 20],
  error: [50, 30, 50],
};

/**
 * Trigger haptic feedback
 * @param {keyof typeof HAPTIC_PATTERNS} type - The type of haptic pattern
 */
export function haptic(type = 'light') {
  if (!('vibrate' in navigator)) return;
  
  const pattern = HAPTIC_PATTERNS[type] ?? HAPTIC_PATTERNS.light;
  navigator.vibrate(pattern);
}

/**
 * Check if haptic feedback is supported
 * @returns {boolean}
 */
export function isHapticSupported() {
  return 'vibrate' in navigator;
}

export default { haptic, isHapticSupported };
