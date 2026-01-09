/**
 * Speak Button Component
 * Behavior only - template is in HTML via Declarative Shadow DOM
 */

import { haptic } from '../services/haptic.js';

export class SpeakButton extends HTMLElement {
  #button = null;
  #textSpan = null;
  #defaultText = 'tap to speak';

  static get observedAttributes() {
    return ['listening', 'disabled'];
  }

  connectedCallback() {
    this.#button = this.shadowRoot?.querySelector('button');
    this.#textSpan = this.shadowRoot?.querySelector('.text');
    this.#defaultText = this.textContent?.trim() || 'tap to speak';

    this.#button?.addEventListener('touchstart', () => haptic('light'), { passive: true });
    this.#button?.addEventListener('click', () => this.#handleClick());
  }

  get listening() {
    return this.hasAttribute('listening');
  }

  set listening(value) {
    const wasListening = this.listening;
    this.toggleAttribute('listening', Boolean(value));
    
    if (this.#textSpan) {
      this.#textSpan.textContent = value ? 'listening...' : this.#defaultText;
    }
    
    // Haptic feedback on state change
    if (value && !wasListening) {
      haptic('success'); // Started listening
    }
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }

  set disabled(value) {
    this.toggleAttribute('disabled', Boolean(value));
    if (this.#button) {
      this.#button.disabled = Boolean(value);
    }
  }

  #handleClick() {
    if (this.disabled) return;
    
    // Haptic feedback on activation
    haptic('medium');
    
    this.dispatchEvent(new CustomEvent('speak-toggle', {
      bubbles: true,
      composed: true,
    }));
  }
}

customElements.define('speak-button', SpeakButton);
