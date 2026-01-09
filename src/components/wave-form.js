/**
 * Wave Form Component
 * Audio-reactive visualization bars
 */

import { audioAnalyzer } from '../services/audio-analyzer.js';

export class WaveForm extends HTMLElement {
  #bars = [];
  #boundUpdateBars = null;

  static get observedAttributes() {
    return ['active', 'bars'];
  }

  connectedCallback() {
    // Small delay to ensure Declarative Shadow DOM is fully ready
    requestAnimationFrame(() => {
      this.#cacheBars();
      console.log('[WaveForm] Initialized with', this.#bars.length, 'bars');
    });
    
    // Listen for audio level changes
    this.#boundUpdateBars = (e) => this.#updateBars(e.detail);
    audioAnalyzer.addEventListener('levels', this.#boundUpdateBars);
  }

  disconnectedCallback() {
    if (this.#boundUpdateBars) {
      audioAnalyzer.removeEventListener('levels', this.#boundUpdateBars);
    }
  }

  #cacheBars() {
    this.#bars = Array.from(this.shadowRoot?.querySelectorAll('.bar') || []);
  }

  #updateBars({ levels }) {
    if (!this.active) return;
    
    // Ensure bars are cached (defensive re-query)
    if (!this.#bars.length) {
      this.#cacheBars();
    }
    
    if (!this.#bars.length) return;

    this.#bars.forEach((bar, index) => {
      // Map bar index to frequency bands (mirror for symmetric look)
      const centerIndex = Math.floor(this.#bars.length / 2);
      const distance = Math.abs(index - centerIndex);
      const bandIndex = Math.min(distance, levels.length - 1);
      const level = levels[bandIndex];
      
      // Calculate height based on level (15px to 45px)
      const minHeight = 15;
      const maxHeight = 45;
      const height = minHeight + level * (maxHeight - minHeight);
      
      bar.style.height = `${height}px`;
    });
  }

  get active() {
    return this.hasAttribute('active');
  }

  set active(value) {
    const wasActive = this.active;
    this.toggleAttribute('active', Boolean(value));
    
    // Reset bars when becoming inactive
    if (wasActive && !value) {
      this.#bars.forEach(bar => {
        bar.style.height = '';
      });
    }
    
    // Cache bars when becoming active
    if (!wasActive && value) {
      this.#cacheBars();
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'bars' && oldValue !== newValue) {
      this.#updateBarCount(parseInt(newValue, 10));
    }
  }

  #updateBarCount(count) {
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
    
    this.#cacheBars();
  }
}

customElements.define('wave-form', WaveForm);
