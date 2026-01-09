/**
 * Status Display Component
 * Behavior only - template is in HTML via Declarative Shadow DOM
 */

export class StatusDisplay extends HTMLElement {
  #textElement = null;

  static get observedAttributes() {
    return ['active'];
  }

  connectedCallback() {
    this.#textElement = this.shadowRoot?.querySelector('.text');
  }

  get status() {
    return this.#textElement?.textContent || '';
  }

  set status(value) {
    if (this.#textElement) {
      this.#textElement.textContent = value;
    }
    this.active = value !== 'ready';
  }

  get active() {
    return this.hasAttribute('active');
  }

  set active(value) {
    this.toggleAttribute('active', Boolean(value));
  }

  update(text) {
    this.status = text;
  }
}

customElements.define('status-display', StatusDisplay);
