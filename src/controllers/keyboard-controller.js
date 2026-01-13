/**
 * Keyboard Controller
 * Handles keyboard shortcuts including Cmd+K for Command Palette
 */

class KeyboardController {
  #handlers = {};

  constructor() {
    this.#bindEvents();
  }

  #bindEvents() {
    document.addEventListener('keydown', (e) => this.#handleKeydown(e));
  }

  /**
   * Register keyboard handlers
   * @param {Object} handlers - Map of actions to handler functions
   */
  register(handlers) {
    this.#handlers = handlers;
  }

  #handleKeydown(e) {
    const key = typeof e.key === 'string' ? e.key : '';
    const keyLower = key.toLowerCase();

    // Cmd+K / Ctrl+K opens Command Palette (launchpad)
    if ((e.metaKey || e.ctrlKey) && !e.altKey && keyLower === 'k') {
      e.preventDefault();
      const launchpad = document.getElementById('launchpad');
      launchpad?.toggle();
      return;
    }
    
    // Cmd+P / Ctrl+P also opens Command Palette (VS Code style)
    if ((e.metaKey || e.ctrlKey) && !e.altKey && keyLower === 'p' && !e.shiftKey) {
      e.preventDefault();
      const launchpad = document.getElementById('launchpad');
      launchpad?.toggle();
      return;
    }
    
    // Ignore if typing in any editable surface (inputs, textareas, contenteditable, etc)
    const target = e.target;
    const isEditableTarget = target instanceof Element && (
      target.matches('input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"]') ||
      target.closest('input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"]') ||
      target.isContentEditable
    );
    if (isEditableTarget) return;

    // Ignore if apps that require full keyboard input are open
    const commandsApp = document.getElementById('commandsApp');
    if (commandsApp?.hasAttribute('open')) return;

    const coderApp = document.getElementById('coderApp');
    if (coderApp?.hasAttribute('open')) return;

    const textEditor = document.getElementById('textEditor');
    if (textEditor?.hasAttribute('open')) return;

    if (e.code === 'Space') {
      // Avoid repeated toggles when key is held
      if (e.repeat) return;
      e.preventDefault();
      this.#handlers.onSpace?.();
      return;
    }

    if (key === '1') {
      this.#handlers.onOne?.();
      return;
    }

    if (key === '2') {
      this.#handlers.onTwo?.();
      return;
    }

    if (key === 'Escape') {
      this.#handlers.onEscape?.();
      return;
    }
  }
}

export const keyboardController = new KeyboardController();
