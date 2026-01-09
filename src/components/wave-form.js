/**
 * Wave Form Component
 * Behavior only - template is in HTML via Declarative Shadow DOM
 */

export class WaveForm extends HTMLElement {
  static get observedAttributes() {
    return ['active', 'bars'];
  }

  get active() {
    return this.hasAttribute('active');
  }

  set active(value) {
    this.toggleAttribute('active', Boolean(value));
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'bars' && oldValue !== newValue) {
      this.#updateBars(parseInt(newValue, 10));
    }
  }

  #updateBars(count) {
    const shadowRoot = this.shadowRoot;
    if (!shadowRoot) return;
    
    const existingBars = shadowRoot.querySelectorAll('.bar');
    if (count === existingBars.length) return;

    // Remove all existing bars
    existingBars.forEach(bar => bar.remove());

    // Add new bars
    for (let i = 0; i < count; i++) {
      const bar = document.createElement('div');
      bar.className = 'bar';
      shadowRoot.appendChild(bar);
    }
  }
}

customElements.define('wave-form', WaveForm);
