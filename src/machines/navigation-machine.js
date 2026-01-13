// @ts-check
/**
 * Navigation State Machine
 * XState v5 machine for managing window navigation with back/forward/close
 * 
 * @module NavigationMachine
 * 
 * Features:
 * - Back/Forward navigation stack (like browser history)
 * - Modal presentation stack (overlays)
 * - Per-app state preservation
 * - Transition animations coordination
 */

import { createMachine, assign } from 'xstate';

/** @typedef {import('../types.js').WindowRef} WindowRef */
/** @typedef {import('../types.js').ModalRef} ModalRef */
/** @typedef {import('../types.js').NavigationContext} NavigationContext */
/** @typedef {import('../types.js').TransitionDirection} TransitionDirection */

export const navigationMachine = createMachine({
  id: 'navigation',
  initial: 'home',
  context: /** @type {NavigationContext} */ ({
    backStack: [],
    forwardStack: [],
    current: null,
    modalStack: [],
    transitionDirection: null,
  }),
  states: {
    // Home state - no windows open
    home: {
      entry: assign({ transitionDirection: null }),
      on: {
        PUSH: {
          target: 'transitioning',
          actions: 'preparePush',
        },
        PRESENT: {
          target: 'presenting',
        },
      },
    },

    // Active state - window is open and interactive
    active: {
      entry: assign({ transitionDirection: null }),
      on: {
        PUSH: {
          target: 'transitioning',
          actions: 'preparePush',
        },
        BACK: {
          target: 'transitioning',
          actions: 'prepareBack',
          guard: 'canGoBack',
        },
        FORWARD: {
          target: 'transitioning',
          actions: 'prepareForward',
          guard: 'canGoForward',
        },
        CLOSE: {
          target: 'closing',
        },
        PRESENT: {
          target: 'presenting',
        },
        // Update current window's state without navigation
        UPDATE_STATE: {
          actions: 'updateCurrentState',
        },
        // Update title of current window
        UPDATE_TITLE: {
          actions: 'updateCurrentTitle',
        },
      },
    },

    // Transitioning between windows (animation state)
    transitioning: {
      after: {
        250: [
          { target: 'active', guard: 'hasCurrent' },
          { target: 'home' },
        ],
      },
    },

    // Closing all windows
    closing: {
      entry: [
        assign({ transitionDirection: 'close' }),
        'clearStacks',
      ],
      after: {
        200: 'home',
      },
    },

    // Presenting a modal
    presenting: {
      entry: 'pushModal',
      after: {
        250: 'modalActive',
      },
    },

    // Modal is active and interactive
    modalActive: {
      on: {
        DISMISS: {
          target: 'dismissing',
          guard: 'hasModals',
        },
        PRESENT: {
          target: 'presenting',
        },
        // Allow CLOSE to dismiss all modals and close windows
        CLOSE: {
          target: 'closingAll',
        },
      },
    },

    // Dismissing a modal
    dismissing: {
      entry: 'popModal',
      after: {
        250: [
          { target: 'modalActive', guard: 'hasModals' },
          { target: 'active', guard: 'hasCurrent' },
          { target: 'home' },
        ],
      },
    },

    // Closing everything (modals + windows)
    closingAll: {
      entry: [
        assign({ transitionDirection: 'close' }),
        'clearAll',
      ],
      after: {
        200: 'home',
      },
    },
  },
}, {
  guards: {
    canGoBack: ({ context }) => context.backStack.length > 0,
    canGoForward: ({ context }) => context.forwardStack.length > 0,
    hasModals: ({ context }) => context.modalStack.length > 0,
    hasCurrent: ({ context }) => context.current !== null,
  },
  actions: {
    preparePush: assign(({ context, event }) => ({
      backStack: context.current
        ? [...context.backStack, context.current]
        : context.backStack,
      forwardStack: [], // Clear forward on new push
      current: {
        id: event.id,
        title: event.title || event.id,
        state: event.state || {},
        timestamp: Date.now(),
      },
      transitionDirection: 'push',
    })),

    prepareBack: assign(({ context }) => {
      const prev = context.backStack[context.backStack.length - 1];
      return {
        backStack: context.backStack.slice(0, -1),
        forwardStack: context.current
          ? [context.current, ...context.forwardStack]
          : context.forwardStack,
        current: prev || null,
        transitionDirection: 'back',
      };
    }),

    prepareForward: assign(({ context }) => {
      const next = context.forwardStack[0];
      return {
        backStack: context.current
          ? [...context.backStack, context.current]
          : context.backStack,
        forwardStack: context.forwardStack.slice(1),
        current: next || null,
        transitionDirection: 'forward',
      };
    }),

    clearStacks: assign({
      backStack: [],
      forwardStack: [],
      current: null,
    }),

    clearAll: assign({
      backStack: [],
      forwardStack: [],
      current: null,
      modalStack: [],
    }),

    pushModal: assign(({ context, event }) => ({
      modalStack: [
        ...context.modalStack,
        {
          id: event.id,
          state: event.state || {},
          timestamp: Date.now(),
        },
      ],
    })),

    popModal: assign(({ context }) => ({
      modalStack: context.modalStack.slice(0, -1),
    })),

    updateCurrentState: assign(({ context, event }) => ({
      current: context.current
        ? {
            ...context.current,
            state: { ...context.current.state, ...event.state },
          }
        : null,
    })),

    updateCurrentTitle: assign(({ context, event }) => ({
      current: context.current
        ? {
            ...context.current,
            title: event.title,
          }
        : null,
    })),
  },
});

/**
 * Event creators for navigation actions
 */
export const navigationEvents = {
  /**
   * Create a PUSH event
   * @param {string} id - Window identifier
   * @param {string} [title] - Display title
   * @param {Record<string, unknown>} [state] - Initial state
   * @returns {{ type: 'PUSH', id: string, title?: string, state?: Record<string, unknown> }}
   */
  push: (id, title, state) => ({ type: 'PUSH', id, title, state }),
  
  /** @returns {{ type: 'BACK' }} */
  back: () => ({ type: 'BACK' }),
  
  /** @returns {{ type: 'FORWARD' }} */
  forward: () => ({ type: 'FORWARD' }),
  
  /** @returns {{ type: 'CLOSE' }} */
  close: () => ({ type: 'CLOSE' }),
  
  /**
   * Create a PRESENT event
   * @param {string} id - Modal identifier
   * @param {Record<string, unknown>} [state] - Initial state
   * @returns {{ type: 'PRESENT', id: string, state?: Record<string, unknown> }}
   */
  present: (id, state) => ({ type: 'PRESENT', id, state }),
  
  /** @returns {{ type: 'DISMISS' }} */
  dismiss: () => ({ type: 'DISMISS' }),
  
  /**
   * @param {Record<string, unknown>} state - State to merge
   * @returns {{ type: 'UPDATE_STATE', state: Record<string, unknown> }}
   */
  updateState: (state) => ({ type: 'UPDATE_STATE', state }),
  
  /**
   * @param {string} title - New title
   * @returns {{ type: 'UPDATE_TITLE', title: string }}
   */
  updateTitle: (title) => ({ type: 'UPDATE_TITLE', title }),
};
