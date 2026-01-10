/**
 * Shared Type Definitions
 * Central location for reusable JSDoc types across the codebase
 */

// ─────────────────────────────────────────────────────────────────────────────
// Navigation Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} WindowRef
 * @property {string} id - Window identifier (e.g., 'files', 'coder')
 * @property {string} title - Display title
 * @property {Record<string, unknown>} [state] - App-specific state to restore
 * @property {number} timestamp - When window was opened
 */

/**
 * @typedef {Object} ModalRef
 * @property {string} id - Modal identifier (e.g., 'clock', 'settings')
 * @property {Record<string, unknown>} [state] - Modal-specific state
 * @property {number} timestamp - When modal was presented
 */

/**
 * @typedef {Object} NavigationContext
 * @property {WindowRef[]} backStack - History for back navigation
 * @property {WindowRef[]} forwardStack - Future for forward navigation
 * @property {WindowRef|null} current - Currently active window
 * @property {ModalRef[]} modalStack - Modal overlay stack
 * @property {'push'|'back'|'forward'|'close'|null} transitionDirection - Animation direction
 */

/**
 * @typedef {'push'|'back'|'forward'|'close'} TransitionDirection
 */

// ─────────────────────────────────────────────────────────────────────────────
// Voice Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {'her'|'clawd'} VoicePersona
 */

/**
 * @typedef {Object} VoiceSelectDetail
 * @property {VoicePersona} voice - Selected voice persona
 * @property {string} audioSrc - Path to audio file
 */

/**
 * @typedef {Object} VoicePlayingDetail
 * @property {VoicePersona} voice - Currently playing voice
 */

// ─────────────────────────────────────────────────────────────────────────────
// Speech Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} SpeechErrorDetail
 * @property {string} error - Error code
 * @property {string} message - Human-readable error message
 */

/**
 * @typedef {Object} TranscriptDetail
 * @property {string} transcript - Transcribed text
 */

/**
 * @typedef {Object} SpeakingDetail
 * @property {VoicePersona} voice - Voice speaking
 */

// ─────────────────────────────────────────────────────────────────────────────
// Audio Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} AudioLevelsDetail
 * @property {number[]} levels - Frequency band levels (0-1)
 * @property {number} average - Average level across bands
 */

// ─────────────────────────────────────────────────────────────────────────────
// Navigation Event Details
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} NavigationStateChangeDetail
 * @property {string} state - Current state value
 * @property {NavigationContext} context - Full context
 * @property {boolean} canGoBack - Can navigate back
 * @property {boolean} canGoForward - Can navigate forward
 */

/**
 * @typedef {Object} WindowChangeDetail
 * @property {WindowRef} window - Current window
 * @property {TransitionDirection|null} direction - Transition direction
 */

/**
 * @typedef {Object} ModalChangeDetail
 * @property {ModalRef} modal - Top modal
 * @property {ModalRef[]} stack - Full modal stack
 */

// Make this file a module
export {};
