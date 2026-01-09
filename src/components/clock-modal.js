/**
 * Clock Modal - Her OS1 Analog Clock
 * Bold, simple, elegant fullscreen timepiece with personality
 * 
 * Usage: <clock-modal></clock-modal>
 * Methods: open(), close(), toggle()
 * Events: 'open', 'close'
 */

import { generateDateGreeting } from '../services/date-greetings.js';
import './handwrite-text.js';

export class ClockModal extends HTMLElement {
  #animationFrame = null;
  #isOpen = false;
  #boundHandleKeydown = null;

  constructor() {
    super();
    this.#boundHandleKeydown = this.#handleKeydown.bind(this);
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = this.#getTemplate();
    }

    this.#cacheElements();
    this.#bindEvents();
    this.#updateClock();
  }

  disconnectedCallback() {
    this.#stopAnimation();
    document.removeEventListener('keydown', this.#boundHandleKeydown);
  }

  #getTemplate() {
    return `
      <link rel="stylesheet" href="src/components/styles/clock-modal.css">
      
      <button class="close-btn" aria-label="Close clock" type="button">
        <svg viewBox="0 0 24 24" fill="none">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>
      
      <div class="date-display" id="dateDisplay"></div>
      <handwrite-text class="handwrite-greeting" id="handwriteGreeting" color="oklch(1 0 0 / 0.85)" animate></handwrite-text>
      
      <div class="clock-container">
        <svg class="clock-svg" viewBox="0 0 400 400">
          <!-- Clock face -->
          <circle class="clock-face" cx="200" cy="200" r="175" />
          
          <!-- Hour markers -->
          ${this.#generateHourMarkers()}
          
          <!-- Roman numerals -->
          ${this.#generateNumerals()}
          
          <!-- Clock hands -->
          <line class="hand hand-hour" id="hourHand" x1="200" y1="200" x2="200" y2="100" />
          <line class="hand hand-minute" id="minuteHand" x1="200" y1="200" x2="200" y2="60" />
          <line class="hand hand-second" id="secondHand" x1="200" y1="230" x2="200" y2="55" />
          
          <!-- Center dot -->
          <circle class="center-dot" cx="200" cy="200" r="6" />
        </svg>
      </div>
      
      <div class="digital-time" id="digitalTime"></div>
    `;
  }

  #generateHourMarkers() {
    const markers = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const innerRadius = 155;
      const outerRadius = 172;
      const x1 = 200 + innerRadius * Math.cos(angle);
      const y1 = 200 + innerRadius * Math.sin(angle);
      const x2 = 200 + outerRadius * Math.cos(angle);
      const y2 = 200 + outerRadius * Math.sin(angle);
      markers.push(`<line class="hour-marker" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`);
    }
    return markers.join('\n');
  }

  #generateNumerals() {
    const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    const elements = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const radius = 130;
      const x = 200 + radius * Math.cos(angle);
      const y = 200 + radius * Math.sin(angle);
      elements.push(`<text class="numeral" x="${x}" y="${y}">${numerals[i]}</text>`);
    }
    return elements.join('\n');
  }

  #cacheElements() {
    const sr = this.shadowRoot;
    this.elements = {
      closeBtn: sr.querySelector('.close-btn'),
      hourHand: sr.getElementById('hourHand'),
      minuteHand: sr.getElementById('minuteHand'),
      secondHand: sr.getElementById('secondHand'),
      digitalTime: sr.getElementById('digitalTime'),
      dateDisplay: sr.getElementById('dateDisplay'),
      handwriteGreeting: sr.getElementById('handwriteGreeting')
    };
  }

  #bindEvents() {
    // Close button - use direct onclick for reliability
    const closeBtn = this.shadowRoot.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      };
    }
    
    // Click on backdrop (the host element itself) to close
    this.onclick = (e) => {
      if (e.target === this && this.#isOpen) {
        this.close();
      }
    };
  }

  #handleKeydown(e) {
    if (e.key === 'Escape' && this.#isOpen) {
      e.preventDefault();
      this.close();
    }
  }

  #updateClock() {
    const now = new Date();
    
    const hours = now.getHours() % 12;
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const milliseconds = now.getMilliseconds();
    
    // Calculate smooth rotations
    const secondRotation = (seconds + milliseconds / 1000) * 6;
    const minuteRotation = (minutes + seconds / 60) * 6;
    const hourRotation = (hours + minutes / 60) * 30;
    
    // Apply rotations
    this.#setHandRotation(this.elements.hourHand, hourRotation);
    this.#setHandRotation(this.elements.minuteHand, minuteRotation);
    this.#setHandRotation(this.elements.secondHand, secondRotation);
    
    // Update digital time
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    if (this.elements.digitalTime) {
      this.elements.digitalTime.textContent = timeStr;
    }
    
    // Update date greeting (only once per open, not every frame)
    if (this.elements.dateDisplay && !this.elements.dateDisplay.textContent) {
      const greeting = generateDateGreeting(now);
      this.elements.dateDisplay.textContent = greeting;
      
      // Set handwriting text to match the greeting
      if (this.elements.handwriteGreeting) {
        this.elements.handwriteGreeting.setAttribute('text', greeting);
      }
    }
    
    if (this.#isOpen) {
      this.#animationFrame = requestAnimationFrame(() => this.#updateClock());
    }
  }

  #setHandRotation(element, degrees) {
    if (element) {
      element.style.transform = `rotate(${degrees}deg)`;
    }
  }

  #startAnimation() {
    // Clear date so it regenerates with new random greeting
    if (this.elements.dateDisplay) {
      this.elements.dateDisplay.textContent = '';
    }
    // Clear handwriting so it regenerates with new variation
    if (this.elements.handwriteGreeting) {
      this.elements.handwriteGreeting.removeAttribute('text');
    }
    this.#updateClock();
  }

  #stopAnimation() {
    if (this.#animationFrame) {
      cancelAnimationFrame(this.#animationFrame);
      this.#animationFrame = null;
    }
  }

  // Public API
  open() {
    if (this.#isOpen) return;
    
    this.#isOpen = true;
    this.setAttribute('open', '');
    this.#startAnimation();
    
    // Listen for Escape key
    document.addEventListener('keydown', this.#boundHandleKeydown);
    
    // Focus the close button for better keyboard accessibility
    requestAnimationFrame(() => {
      this.shadowRoot?.querySelector('.close-btn')?.focus();
    });
    
    this.dispatchEvent(new CustomEvent('open'));
    console.log('[ClockModal] Opened');
  }

  close() {
    if (!this.#isOpen) return;
    
    this.#isOpen = false;
    this.removeAttribute('open');
    this.#stopAnimation();
    
    document.removeEventListener('keydown', this.#boundHandleKeydown);
    
    this.dispatchEvent(new CustomEvent('close'));
    console.log('[ClockModal] Closed');
  }

  toggle() {
    this.#isOpen ? this.close() : this.open();
  }

  get isOpen() {
    return this.#isOpen;
  }
}

customElements.define('clock-modal', ClockModal);
