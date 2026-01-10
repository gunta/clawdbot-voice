/**
 * Navigation State Machine
 * XState v5 machine for managing window navigation with back/forward/close
 * 
 * Features:
 * - Back/Forward navigation stack (like browser history)
 * - Modal presentation stack (overlays)
 * - Per-app state preservation
 * - Transition animations coordination
 */

import { createMachine, assign } from 'https://esm.sh/xstate@5';

/**
 * @typedef {Object} WindowRef
 * @property {string} id - Window identifier (e.g., 'files', 'coder')
 * @property {string} title - Display title
 * @property {Object} [state] - App-specific state to restore
 * @property {number} timestamp - When window was opened
 */

/**
 * @typedef {Object} ModalRef
 * @property {string} id - Modal identifier (e.g., 'clock', 'settings')
 * @property {Object} [state] - Modal-specific state
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

// Export event creators for convenience
export const navigationEvents = {
  push: (id, title, state) => ({ type: 'PUSH', id, title, state }),
  back: () => ({ type: 'BACK' }),
  forward: () => ({ type: 'FORWARD' }),
  close: () => ({ type: 'CLOSE' }),
  present: (id, state) => ({ type: 'PRESENT', id, state }),
  dismiss: () => ({ type: 'DISMISS' }),
  updateState: (state) => ({ type: 'UPDATE_STATE', state }),
  updateTitle: (title) => ({ type: 'UPDATE_TITLE', title }),
};
