/**
 * Voice Card Component
 * Behavior only - template is in HTML via Declarative Shadow DOM
 */

import { haptic } from '../services/haptic.js';

export class VoiceCard extends HTMLElement {
  static get observedAttributes() {
    return ['selected', 'playing', 'voice', 'audio-src'];
  }

  connectedCallback() {
    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');

    this.addEventListener('touchstart', () => haptic('light'), { passive: true });
    this.addEventListener('click', () => this.#handleClick());
    this.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.#handleClick();
      }
    });
  }

  get voice() {
    return this.getAttribute('voice');
  }

  get audioSrc() {
    return this.getAttribute('audio-src');
  }

  get selected() {
    return this.hasAttribute('selected');
  }

  set selected(value) {
    this.toggleAttribute('selected', Boolean(value));
  }

  get playing() {
    return this.hasAttribute('playing');
  }

  set playing(value) {
    this.toggleAttribute('playing', Boolean(value));
  }

  #handleClick() {
    this.dispatchEvent(new CustomEvent('voice-select', {
      bubbles: true,
      composed: true,
      detail: { 
        voice: this.voice, 
        audioSrc: this.audioSrc 
      },
    }));
  }
}

customElements.define('voice-card', VoiceCard);
