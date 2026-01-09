/**
 * OS Header Component
 * Behavior only - template is in HTML via Declarative Shadow DOM
 */

export class OsHeader extends HTMLElement {
  #clockElement = null;
  #intervalId = null;

  static get observedAttributes() {
    return ['badge'];
  }

  connectedCallback() {
    this.#clockElement = this.shadowRoot?.querySelector('.clock');
    this.#updateClock();
    this.#intervalId = setInterval(() => this.#updateClock(), 1000);
  }

  disconnectedCallback() {
    if (this.#intervalId) {
      clearInterval(this.#intervalId);
      this.#intervalId = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'badge' && oldValue !== newValue) {
      const badge = this.shadowRoot?.querySelector('.badge');
      if (badge) badge.textContent = newValue;
    }
  }

  #updateClock() {
    if (!this.#clockElement) return;
    const now = new Date();
    this.#clockElement.textContent = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
}

customElements.define('os-header', OsHeader);
