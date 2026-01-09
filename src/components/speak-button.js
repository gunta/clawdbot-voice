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
    this.toggleAttribute('listening', Boolean(value));
    if (this.#textSpan) {
      this.#textSpan.textContent = value ? 'listening...' : this.#defaultText;
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
    
    this.dispatchEvent(new CustomEvent('speak-toggle', {
      bubbles: true,
      composed: true,
    }));
  }
}

customElements.define('speak-button', SpeakButton);
