/**
 * Keyboard Controller
 * Handles keyboard shortcuts
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
    // Ignore if typing in input
    if (e.target.matches('input, textarea')) return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        this.#handlers.onSpace?.();
        break;

      case '1':
        this.#handlers.onOne?.();
        break;

      case '2':
        this.#handlers.onTwo?.();
        break;

      case 'Escape':
        this.#handlers.onEscape?.();
        break;
    }
  }
}

export const keyboardController = new KeyboardController();
