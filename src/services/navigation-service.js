// @ts-check
/**
 * Navigation Service
 * Singleton service wrapping XState actor for window/modal navigation
 * 
 * @module NavigationService
 * 
 * Usage:
 *   import { navigationService } from './services/navigation-service.js';
 *   
 *   // Push a new window
 *   navigationService.push('files', 'Files');
 *   
 *   // Navigate back/forward
 *   navigationService.back();
 *   navigationService.forward();
 *   
 *   // Present a modal
 *   navigationService.present('settings');
 *   navigationService.dismiss();
 *   
 *   // Subscribe to state changes
 *   navigationService.subscribe((state) => {
 *     console.log('Current window:', state.context.current);
 *   });
 */

/** @typedef {import('../types.js').WindowRef} WindowRef */
/** @typedef {import('../types.js').ModalRef} ModalRef */
/** @typedef {import('../types.js').NavigationContext} NavigationContext */
/** @typedef {import('../types.js').NavigationStateChangeDetail} NavigationStateChangeDetail */
/** @typedef {import('../types.js').WindowChangeDetail} WindowChangeDetail */
/** @typedef {import('../types.js').ModalChangeDetail} ModalChangeDetail */

import { createActor } from 'xstate';
import { navigationMachine, navigationEvents } from '../machines/navigation-machine.js';

class NavigationService extends EventTarget {
  #actor = null;
  #subscribers = new Set();

  constructor() {
    super();
    this.#actor = createActor(navigationMachine);
    
    // Forward state changes to subscribers
    this.#actor.subscribe((snapshot) => {
      this.#notifySubscribers(snapshot);
      this.#dispatchStateEvent(snapshot);
    });
  }

  /**
   * Initialize and start the navigation actor
   * Call this once on app startup
   * @returns {void}
   */
  init() {
    if (this.#actor.status === 'active') {
      console.warn('[NavigationService] Already initialized');
      return;
    }
    
    this.#actor.start();
    console.log('[NavigationService] Initialized');
  }

  /**
   * Get current state snapshot
   * @returns {*} XState snapshot with context and value
   */
  getSnapshot() {
    return this.#actor.getSnapshot();
  }

  /**
   * Get current navigation context
   * @returns {NavigationContext}
   */
  getContext() {
    return this.getSnapshot().context;
  }

  /**
   * Check if can go back
   * @returns {boolean}
   */
  get canGoBack() {
    return this.getContext().backStack.length > 0;
  }

  /**
   * Check if can go forward
   * @returns {boolean}
   */
  get canGoForward() {
    return this.getContext().forwardStack.length > 0;
  }

  /**
   * Get current window
   * @returns {WindowRef|null}
   */
  get current() {
    return this.getContext().current;
  }

  /**
   * Get current state value (e.g., 'home', 'active', 'modalActive')
   * @returns {string}
   */
  get stateValue() {
    return this.getSnapshot().value;
  }

  /**
   * Check if a specific window is currently active
   * @param {string} windowId - Window identifier to check
   * @returns {boolean}
   */
  isActive(windowId) {
    return this.current?.id === windowId;
  }

  /**
   * Check if a specific modal is currently presented
   * @param {string} modalId - Modal identifier to check
   * @returns {boolean}
   */
  isModalPresented(modalId) {
    const { modalStack } = this.getContext();
    return modalStack.some(m => m.id === modalId);
  }

  /**
   * Check if any modal is presented
   * @returns {boolean}
   */
  get hasModals() {
    return this.getContext().modalStack.length > 0;
  }

  /**
   * Get the topmost modal
   * @returns {ModalRef|null}
   */
  get topModal() {
    const { modalStack } = this.getContext();
    return modalStack[modalStack.length - 1] || null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Navigation Actions
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Push a new window onto the stack
   * @param {string} id - Window identifier
   * @param {string} [title] - Display title (defaults to id)
   * @param {Record<string, unknown>} [state] - Initial state for the window
   * @returns {void}
   */
  push(id, title, state) {
    this.#actor.send(navigationEvents.push(id, title, state));
    console.log('[NavigationService] Push:', id, title);
  }

  /**
   * Go back to previous window
   * @returns {boolean} True if navigation occurred
   */
  back() {
    if (!this.canGoBack) {
      console.warn('[NavigationService] Cannot go back - at start of history');
      return false;
    }
    this.#actor.send(navigationEvents.back());
    console.log('[NavigationService] Back');
    return true;
  }

  /**
   * Go forward to next window (after going back)
   * @returns {boolean} True if navigation occurred
   */
  forward() {
    if (!this.canGoForward) {
      console.warn('[NavigationService] Cannot go forward - at end of history');
      return false;
    }
    this.#actor.send(navigationEvents.forward());
    console.log('[NavigationService] Forward');
    return true;
  }

  /**
   * Close all windows and return to home
   * @returns {void}
   */
  close() {
    this.#actor.send(navigationEvents.close());
    console.log('[NavigationService] Close');
  }

  /**
   * Present a modal overlay
   * @param {string} id - Modal identifier
   * @param {Record<string, unknown>} [state] - Initial state for the modal
   * @returns {void}
   */
  present(id, state) {
    this.#actor.send(navigationEvents.present(id, state));
    console.log('[NavigationService] Present modal:', id);
  }

  /**
   * Dismiss the topmost modal
   * @returns {boolean} True if a modal was dismissed
   */
  dismiss() {
    if (!this.hasModals) {
      console.warn('[NavigationService] No modal to dismiss');
      return false;
    }
    this.#actor.send(navigationEvents.dismiss());
    console.log('[NavigationService] Dismiss modal');
    return true;
  }

  /**
   * Update current window's state
   * @param {Record<string, unknown>} state - State to merge
   * @returns {void}
   */
  updateState(state) {
    this.#actor.send(navigationEvents.updateState(state));
  }

  /**
   * Update current window's title
   * @param {string} title - New title
   * @returns {void}
   */
  updateTitle(title) {
    this.#actor.send(navigationEvents.updateTitle(title));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Subscriptions
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Subscribe to state changes
   * @param {(snapshot: *) => void} callback - Called with state snapshot
   * @returns {() => void} Unsubscribe function
   */
  subscribe(callback) {
    this.#subscribers.add(callback);
    
    // Immediately call with current state
    callback(this.getSnapshot());
    
    return () => {
      this.#subscribers.delete(callback);
    };
  }

  #notifySubscribers(snapshot) {
    for (const callback of this.#subscribers) {
      try {
        callback(snapshot);
      } catch (err) {
        console.error('[NavigationService] Subscriber error:', err);
      }
    }
  }

  #dispatchStateEvent(snapshot) {
    const { context } = snapshot;
    
    // Dispatch custom events for different state changes
    this.dispatchEvent(new CustomEvent('state-change', {
      detail: /** @type {NavigationStateChangeDetail} */ ({
        state: snapshot.value,
        context,
        canGoBack: this.canGoBack,
        canGoForward: this.canGoForward,
      }),
    }));

    // Specific events for window changes
    if (context.current) {
      this.dispatchEvent(new CustomEvent('window-change', {
        detail: /** @type {WindowChangeDetail} */ ({
          window: context.current,
          direction: context.transitionDirection,
        }),
      }));
    }

    // Modal events
    if (context.modalStack.length > 0) {
      this.dispatchEvent(new CustomEvent('modal-change', {
        detail: /** @type {ModalChangeDetail} */ ({
          modal: context.modalStack[context.modalStack.length - 1],
          stack: context.modalStack,
        }),
      }));
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get navigation history (back stack + current + forward stack)
   * @returns {{ back: WindowRef[], current: WindowRef|null, forward: WindowRef[] }}
   */
  getHistory() {
    const { backStack, current, forwardStack } = this.getContext();
    return {
      back: [...backStack],
      current,
      forward: [...forwardStack],
    };
  }

  /**
   * Debug: log current state
   * @returns {void}
   */
  debug() {
    const snapshot = this.getSnapshot();
    console.log('[NavigationService] Debug:', {
      state: snapshot.value,
      context: snapshot.context,
      canGoBack: this.canGoBack,
      canGoForward: this.canGoForward,
    });
  }
}

// Export singleton instance
export const navigationService = new NavigationService();

// Also export class for testing
export { NavigationService };
