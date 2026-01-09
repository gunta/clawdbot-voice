/**
 * Haptic Feedback Service
 * Provides tactile feedback with iOS checkbox hack fallback
 */

// Detect touch device (likely to support haptics)
const supportsHaptics = typeof window !== 'undefined' 
  && window.matchMedia('(pointer: coarse)').matches;

/**
 * Trigger a single haptic pulse using iOS checkbox hack
 */
function iosHaptic() {
  try {
    if (!supportsHaptics) return;

    // iOS hack: clicking a hidden switch checkbox triggers haptic
    const label = document.createElement('label');
    label.ariaHidden = 'true';
    label.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    label.appendChild(input);

    document.body.appendChild(label);
    label.click();
    document.body.removeChild(label);
  } catch {
    // Silently fail
  }
}

/**
 * Trigger haptic feedback
 * @param {'light' | 'medium' | 'success' | 'error'} type - Feedback type
 */
export function haptic(type = 'light') {
  // Try native vibration API first (Android, some browsers)
  if (navigator.vibrate) {
    const patterns = {
      light: [10],
      medium: [30],
      success: [10, 50, 20],
      error: [50, 30, 50, 30, 50],
    };
    navigator.vibrate(patterns[type] ?? patterns.light);
    return;
  }

  // iOS fallback using checkbox hack
  switch (type) {
    case 'success':
      iosHaptic();
      setTimeout(iosHaptic, 120);
      break;
    case 'error':
      iosHaptic();
      setTimeout(iosHaptic, 120);
      setTimeout(iosHaptic, 240);
      break;
    default:
      iosHaptic();
  }
}

/**
 * Check if haptic feedback is likely supported
 * @returns {boolean}
 */
export function isHapticSupported() {
  return 'vibrate' in navigator || supportsHaptics;
}

export default { haptic, isHapticSupported };
