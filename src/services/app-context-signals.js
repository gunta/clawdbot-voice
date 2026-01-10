/**
 * App Context Signals
 * Reactive state management for inter-app communication using Preact Signals
 */
import { signal, computed, effect, batch } from '@preact/signals';

// Global context store - reactive Map wrapper
const contextStore = signal(new Map());

/**
 * Get or create a context value with reactive updates
 * @param {string} key - Context key
 * @param {any} initialValue - Default value if key doesn't exist
 * @returns {[Signal, Function]} Tuple of [value signal, setter function]
 */
export function useAppContext(key, initialValue) {
  // Initialize on first access
  if (!contextStore.value.has(key) && initialValue !== undefined) {
    const newMap = new Map(contextStore.value);
    newMap.set(key, initialValue);
    contextStore.value = newMap;
  }

  // Computed value that updates when context changes
  const value = computed(() => contextStore.value.get(key));

  // Setter function
  const setValue = (newValue) => {
    const newMap = new Map(contextStore.value);
    const resolvedValue = typeof newValue === 'function'
      ? newValue(contextStore.value.get(key))
      : newValue;
    newMap.set(key, resolvedValue);
    contextStore.value = newMap;
  };

  return [value, setValue];
}

/**
 * Read-only access to context value
 * @param {string} key - Context key
 * @returns {Signal} Computed signal for the value
 */
export function getContext(key) {
  return computed(() => contextStore.value.get(key));
}

/**
 * Set context value directly
 * @param {string} key - Context key
 * @param {any} value - Value to set
 */
export function setContext(key, value) {
  const newMap = new Map(contextStore.value);
  newMap.set(key, value);
  contextStore.value = newMap;
}

/**
 * Delete a context key
 * @param {string} key - Context key to delete
 */
export function deleteContext(key) {
  const newMap = new Map(contextStore.value);
  newMap.delete(key);
  contextStore.value = newMap;
}

/**
 * Batch multiple context updates together
 * @param {Function} callback - Function containing updates
 */
export function batchContextUpdates(callback) {
  batch(callback);
}

// Message bus for inter-app communication
const messageQueue = signal([]);
const MESSAGE_RETENTION = 100; // Keep last 100 messages

/**
 * Send a message to the app message bus
 * @param {string} type - Message type/channel
 * @param {any} payload - Message data
 */
export function sendMessage(type, payload) {
  const message = {
    id: crypto.randomUUID(),
    type,
    payload,
    timestamp: Date.now(),
  };

  const newQueue = [...messageQueue.value, message].slice(-MESSAGE_RETENTION);
  messageQueue.value = newQueue;
}

/**
 * Subscribe to messages of a specific type
 * @param {string} type - Message type to filter
 * @returns {Signal} Computed signal of filtered messages
 */
export function useMessages(type) {
  return computed(() =>
    messageQueue.value.filter(m => m.type === type)
  );
}

/**
 * Get the latest message of a specific type
 * @param {string} type - Message type
 * @returns {Signal} Computed signal of latest message or null
 */
export function useLatestMessage(type) {
  return computed(() => {
    const messages = messageQueue.value.filter(m => m.type === type);
    return messages[messages.length - 1] || null;
  });
}

/**
 * Subscribe to messages and run callback
 * @param {string} type - Message type
 * @param {Function} callback - Function to run when new message arrives
 * @returns {Function} Cleanup function
 */
export function onMessage(type, callback) {
  let lastProcessedId = null;

  return effect(() => {
    const messages = messageQueue.value.filter(m => m.type === type);
    const latest = messages[messages.length - 1];

    if (latest && latest.id !== lastProcessedId) {
      lastProcessedId = latest.id;
      callback(latest);
    }
  });
}

/**
 * Clear all messages (for cleanup/testing)
 */
export function clearMessages() {
  messageQueue.value = [];
}

/**
 * Clear all context (for cleanup/testing)
 */
export function clearContext() {
  contextStore.value = new Map();
}
