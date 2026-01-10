/**
 * Navigation Signals
 * Reactive Preact Signals wrapper for the XState navigation service
 */
import { signal, computed, effect } from '@preact/signals';
import { navigationService } from './navigation-service.js';

// Core navigation state signal - updated by subscription
const navStateSignal = signal(null);

// Flag to track initialization
let initialized = false;

/**
 * Initialize the navigation signals
 * Must be called after navigationService.init()
 */
export function initNavigationSignals() {
  if (initialized) return;

  if (!navigationService.getSnapshot()) {
    console.warn('[NavigationSignals] Navigation service not initialized');
    return;
  }

  initialized = true;

  // Set initial state
  navStateSignal.value = navigationService.getSnapshot();

  // Subscribe to navigation changes
  navigationService.subscribe((snapshot) => {
    navStateSignal.value = snapshot;
  });

  console.log('[NavigationSignals] Initialized');
}

// Export reactive navigation state - all derived from the single navStateSignal
export const navState = computed(() => navStateSignal.value);
export const currentApp = computed(() => navStateSignal.value?.context?.current);
export const canGoBack = computed(() => (navStateSignal.value?.context?.backStack || []).length > 0);
export const canGoForward = computed(() => (navStateSignal.value?.context?.forwardStack || []).length > 0);
export const modalStack = computed(() => navStateSignal.value?.context?.modalStack || []);
export const hasModals = computed(() => (navStateSignal.value?.context?.modalStack || []).length > 0);
export const transitionDirection = computed(() => navStateSignal.value?.context?.transitionDirection);

// Navigation actions - wrap service methods
export const navigate = {
  push: (id, title, state) => navigationService.push(id, title, state),
  back: () => navigationService.back(),
  forward: () => navigationService.forward(),
  present: (id, state) => navigationService.present(id, state),
  dismiss: () => navigationService.dismiss(),
  close: () => navigationService.close(),
  updateState: (state) => navigationService.updateState(state),
  updateTitle: (title) => navigationService.updateTitle(title),
};

/**
 * Hook for components to subscribe to navigation state
 * Returns current state and navigation actions
 */
export function useNavigation() {
  return {
    state: navState,
    current: currentApp,
    canGoBack,
    canGoForward,
    modalStack,
    hasModals,
    transitionDirection,
    ...navigate,
  };
}

/**
 * Create an effect that runs when navigation state changes
 * @param {Function} callback - Function to run on state change
 * @returns {Function} Cleanup function
 */
export function onNavigationChange(callback) {
  return effect(() => {
    const state = navState.value;
    if (state) {
      callback(state);
    }
  });
}
