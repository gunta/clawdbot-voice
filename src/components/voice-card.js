/**
 * Voice Card Component
 * Behavior + audio-reactive line animations
 */

import { haptic } from '../services/haptic.js';
import { audioAnalyzer } from '../services/audio-analyzer.js';

export class VoiceCard extends HTMLElement {
  #lines = [];
  #boundUpdateLines = null;

  static get observedAttributes() {
    return ['selected', 'playing', 'voice', 'audio-src'];
  }

  connectedCallback() {
    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');

    // Cache the line elements from the slotted SVG
    this.#cacheLines();

    // Bind event handlers
    this.addEventListener('touchstart', () => haptic('light'), { passive: true });
    this.addEventListener('click', () => this.#handleClick());
    this.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.#handleClick();
      }
    });

    // Listen for audio level changes
    this.#boundUpdateLines = (e) => this.#updateLines(e.detail);
    audioAnalyzer.addEventListener('levels', this.#boundUpdateLines);
  }

  disconnectedCallback() {
    if (this.#boundUpdateLines) {
      audioAnalyzer.removeEventListener('levels', this.#boundUpdateLines);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'playing') {
      if (newValue !== null) {
        this.#cacheLines(); // Re-cache in case SVG wasn't ready before
      } else {
        this.#resetLines();
      }
    }
  }

  #cacheLines() {
    // Get all path and shape elements from the slotted SVG
    const svg = this.querySelector('svg');
    if (svg) {
      this.#lines = Array.from(svg.querySelectorAll('path, ellipse, circle'));
    }
  }

  #updateLines({ levels, average }) {
    // Only animate if this card is playing
    if (!this.playing || !this.#lines.length) return;

    this.#lines.forEach((line, index) => {
      // Map line index to a frequency band
      const bandIndex = index % levels.length;
      const level = levels[bandIndex];
      
      // Calculate stroke width based on level (1.5 to 4)
      const strokeWidth = 1.5 + level * 2.5;
      
      // Calculate dash offset for flowing effect
      const dashOffset = (performance.now() / 50) % 24;
      
      // Apply styles directly for performance
      line.style.strokeWidth = `${strokeWidth}px`;
      line.style.strokeDasharray = level > 0.2 ? '8 4' : 'none';
      line.style.strokeDashoffset = level > 0.2 ? `${dashOffset}` : '0';
      
      // Add glow effect based on level
      const glowIntensity = Math.floor(level * 10);
      line.style.filter = level > 0.3 
        ? `drop-shadow(0 0 ${glowIntensity}px rgba(255,255,255,${level * 0.5}))`
        : 'none';
    });
  }

  #resetLines() {
    this.#lines.forEach((line) => {
      line.style.strokeWidth = '';
      line.style.strokeDasharray = '';
      line.style.strokeDashoffset = '';
      line.style.filter = '';
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
    console.log('[VoiceCard] Click handled, voice:', this.voice);
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
