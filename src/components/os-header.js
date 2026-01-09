/**
 * OS Header Component
 * Behavior only - template is in HTML via Declarative Shadow DOM
 */

import { chimes } from '../services/index.js';

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
    
    // Open clock modal and play chime when clock is clicked
    this.#clockElement?.addEventListener('click', () => {
      chimes.clockTap();
      // Open the clock modal if it exists
      const clockModal = document.querySelector('clock-modal');
      if (clockModal) {
        clockModal.open();
      }
    });
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
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    
    // Render with animated colon separator
    this.#clockElement.innerHTML = `<span class="hours">${hours}</span><span class="colon">:</span><span class="minutes">${minutes}</span>`;
  }
}

customElements.define('os-header', OsHeader);
