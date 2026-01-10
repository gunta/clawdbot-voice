/**
 * XState to Preact Signals Bridge
 * Wraps XState actors in reactive Preact Signals for seamless integration
 */
import { signal, computed } from '@preact/signals';

/**
 * Creates a reactive signal wrapper around an XState actor
 * @param {Object} actor - XState actor instance
 * @returns {Object} Signal-wrapped state and helpers
 */
export function createXStateSignal(actor) {
  // Core state signal that updates on every XState transition
  const state = signal(actor.getSnapshot());

  // Subscribe to actor state changes
  const subscription = actor.subscribe((snapshot) => {
    state.value = snapshot;
  });

  // Cleanup function for when component unmounts
  const cleanup = () => {
    subscription.unsubscribe();
  };

  return {
    // Raw state signal
    state,

    // Current state value
    value: computed(() => state.value.value),

    // Current context
    context: computed(() => state.value.context),

    // Check if a specific event can be sent
    can: (eventType) => computed(() => state.value.can({ type: eventType })),

    // Send event to actor
    send: (event) => {
      if (typeof event === 'string') {
        actor.send({ type: event });
      } else {
        actor.send(event);
      }
    },

    // Check if current state matches a state value
    matches: (stateValue) => computed(() => state.value.matches(stateValue)),

    // Check if in a specific state (supports nested states)
    hasTag: (tag) => computed(() => state.value.hasTag(tag)),

    // Get actor reference for direct access if needed
    actor,

    // Cleanup subscription
    cleanup,
  };
}

/**
 * Hook-like helper for using XState signals in Preact components
 * Call cleanup() in component's cleanup effect
 * @param {Object} actor - XState actor instance
 * @returns {Object} Signal-wrapped state and helpers
 */
export function useXStateSignal(actor) {
  return createXStateSignal(actor);
}

/**
 * Creates computed signals for common navigation patterns
 * @param {Object} xstateSignal - Result from createXStateSignal
 * @returns {Object} Navigation-specific computed signals
 */
export function createNavigationHelpers(xstateSignal) {
  const { context } = xstateSignal;

  return {
    current: computed(() => context.value?.current),
    backStack: computed(() => context.value?.backStack || []),
    forwardStack: computed(() => context.value?.forwardStack || []),
    modalStack: computed(() => context.value?.modalStack || []),
    canGoBack: computed(() => (context.value?.backStack || []).length > 0),
    canGoForward: computed(() => (context.value?.forwardStack || []).length > 0),
    hasModals: computed(() => (context.value?.modalStack || []).length > 0),
    transitionDirection: computed(() => context.value?.transitionDirection),
  };
}
