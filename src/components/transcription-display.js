/**
 * Transcription Display Component
 * Behavior only - template is in HTML via Declarative Shadow DOM
 */

export class TranscriptionDisplay extends HTMLElement {
  #textElement = null;

  static get observedAttributes() {
    return ['active', 'interim'];
  }

  connectedCallback() {
    this.#textElement = this.shadowRoot?.querySelector('.text');
  }

  get active() {
    return this.hasAttribute('active');
  }

  set active(value) {
    this.toggleAttribute('active', Boolean(value));
  }

  get interim() {
    return this.hasAttribute('interim');
  }

  set interim(value) {
    this.toggleAttribute('interim', Boolean(value));
  }

  update(text, isInterim = false) {
    if (this.#textElement) {
      this.#textElement.textContent = text;
    }
    this.interim = isInterim;
  }

  clear() {
    if (this.#textElement) {
      this.#textElement.textContent = '';
    }
    this.interim = false;
  }
}

customElements.define('transcription-display', TranscriptionDisplay);
