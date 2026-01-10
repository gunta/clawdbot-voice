/**
 * Clock Modal Component
 * Her OS1 Analog Clock - Full-screen elegant timepiece with personality
 * Migrated to Preact + HTM + Signals
 *
 * Usage: <clock-modal></clock-modal>
 * Methods: open(), close(), toggle()
 * Events: 'open', 'close'
 */
import { html } from 'htm/preact';
import { useSignal, useComputed } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { createShadowComponent } from '../lib/shadow-component.js';
import { ErrorBoundary } from '../lib/error-boundary.js';
import { navigate } from '../services/navigation-signals.js';
import { generateDateGreeting } from '../services/date-greetings.js';
import { navigationService, systemSounds } from '../services/index.js';
import './handwrite-text.js';

const styles = `
/**
 * Clock Modal - Her OS1 Analog Clock
 * Bold, simple, elegant fullscreen timepiece
 * HDR-enabled with OKLCH colors
 */

:host {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 100);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(1.5rem, 4vh, 3rem);
  padding: max(env(safe-area-inset-top, 20px), 80px) 20px max(env(safe-area-inset-bottom, 20px), 60px);
  background: var(--color-red, oklch(0.55 0.155 25));
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
  -webkit-tap-highlight-color: transparent;
  cursor: pointer;
  box-sizing: border-box;
  /* Enable HDR */
  dynamic-range-limit: no-limit;
}

:host([open]) {
  opacity: 1;
  visibility: visible;
}

/* Close button - top right, large tap target */
.close-btn {
  position: absolute;
  top: max(env(safe-area-inset-top, 16px), 16px);
  right: max(env(safe-area-inset-right, 16px), 16px);
  width: 48px;
  height: 48px;
  border: 2px solid oklch(1 0 0 / 0.4);
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.3s ease, border-color 0.2s ease, background 0.2s ease;
}

.close-btn:hover {
  border-color: oklch(1 0 0 / 0.8);
  background: oklch(1 0 0 / 0.1);
}

.close-btn:active {
  border-color: var(--color-white, oklch(1 0 0));
  background: oklch(1 0 0 / 0.2);
}

.close-btn svg {
  width: 20px;
  height: 20px;
  stroke: oklch(1 0 0 / 0.7);
  stroke-width: 2.5;
  stroke-linecap: round;
  transition: stroke 0.2s ease;
}

.close-btn:hover svg {
  stroke: oklch(1 0 0 / 0.95);
}

.close-btn:active svg {
  stroke: var(--color-white, oklch(1 0 0));
}

/* Fade out close button when idle (no mouse movement for 5s) */
:host([idle]) .close-btn {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.6s ease;
}

/* Date display - human greeting above clock */
.date-display {
  font-family: var(--font-display, 'Bodoni Moda', Georgia, serif);
  font-size: clamp(1.1rem, 3.5vw, 1.5rem);
  font-style: italic;
  font-weight: 400;
  letter-spacing: 0.04em;
  color: var(--color-white-soft, oklch(1 0 0 / 0.85));
  text-align: center;
  max-width: 90%;
  line-height: 1.4;
  cursor: default;
  flex-shrink: 0;
  /* Hide the typed text, we'll show handwritten instead */
  display: none;
}

/* Handwritten greeting below date */
.handwrite-greeting {
  max-width: 90%;
  max-height: clamp(40px, 8vh, 70px);
  flex-shrink: 0;
  cursor: default;
  opacity: 0;
  transform: translateY(-5px);
  transition: opacity 0.4s ease 0.15s, transform 0.4s ease 0.15s;
}

:host([open]) .handwrite-greeting {
  opacity: 1;
  transform: translateY(0);
}

/* Clock container */
.clock-container {
  position: relative;
  width: min(65vw, 65vh);
  height: min(65vw, 65vh);
  max-width: 450px;
  max-height: 450px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

/* Main clock SVG */
.clock-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

/* Clock face - bold outer ring */
.clock-face {
  fill: none;
  stroke: var(--color-white, oklch(1 0 0 / 0.9));
  stroke-width: 3;
}

/* Hour markers - bold */
.hour-marker {
  stroke: var(--color-white, oklch(1 0 0 / 0.9));
  stroke-width: 3;
  stroke-linecap: round;
}

/* Roman numerals - bold */
.numeral {
  fill: var(--color-white, oklch(1 0 0 / 0.9));
  font-family: var(--font-display, 'Bodoni Moda', Georgia, serif);
  font-size: 18px;
  font-style: italic;
  font-weight: 400;
  letter-spacing: 0.05em;
  text-anchor: middle;
  dominant-baseline: middle;
}

/* Clock center */
.center-dot {
  fill: var(--color-white, oklch(1 0 0 / 0.95));
}

/* Clock hands - bold and clean */
.hand {
  stroke: var(--color-white, oklch(1 0 0 / 0.95));
  stroke-linecap: round;
  fill: none;
  transform-origin: center;
}

.hand-hour {
  stroke-width: 5;
}

.hand-minute {
  stroke-width: 4;
}

.hand-second {
  stroke: oklch(1 0 0 / 0.6);
  stroke-width: 2;
}

/* Digital time below clock */
.digital-time {
  font-family: var(--font-body, 'Cormorant Garamond', Georgia, serif);
  font-size: clamp(0.85rem, 2vw, 1rem);
  font-weight: 300;
  letter-spacing: 0.2em;
  color: oklch(1 0 0 / 0.35);
  text-transform: uppercase;
  cursor: default;
  flex-shrink: 0;
}

/* HDR Enhancement - Maximum bright whites on HDR displays */
@media (dynamic-range: high) {
  .clock-face,
  .hour-marker {
    stroke: var(--hdr-white-vivid, oklch(1.3 0 0));
  }

  .numeral,
  .center-dot {
    fill: var(--hdr-white-vivid, oklch(1.3 0 0));
  }

  .hand {
    stroke: var(--hdr-white-peak, oklch(1.5 0 0));
  }

  .date-display {
    color: var(--hdr-white-bright, oklch(1.15 0 0));
  }

  .handwrite-greeting {
    --handwrite-color: var(--hdr-white-bright, oklch(1.15 0 0));
  }
}

/* Entry animation */
:host([open]) .clock-container {
  animation: clock-enter 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

:host([open]) .date-display {
  animation: fade-down 0.4s ease 0.1s forwards;
  opacity: 0;
}

@keyframes clock-enter {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes fade-down {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive - small screens */
@media (max-width: 500px) {
  .clock-container {
    width: min(75vw, 75vh);
    height: min(75vw, 75vh);
  }

  .numeral {
    font-size: 14px;
  }

  .close-btn {
    width: 44px;
    height: 44px;
  }
}

/* Large screens */
@media (min-width: 1200px) {
  .clock-container {
    max-width: 520px;
    max-height: 520px;
  }

  .numeral {
    font-size: 20px;
  }
}

/* Landscape phone - compact layout */
@media (max-height: 500px) and (orientation: landscape) {
  :host {
    flex-direction: row;
    gap: clamp(1rem, 4vw, 3rem);
    padding: 20px;
  }

  .clock-container {
    width: min(70vh, 50vw);
    height: min(70vh, 50vw);
  }

  .date-display {
    font-size: 1rem;
    max-width: 30vw;
  }

  .handwrite-greeting {
    max-width: 30vw;
    max-height: 50px;
  }

  .digital-time {
    position: absolute;
    bottom: 15px;
    left: 50%;
    transform: translateX(-50%);
  }

  .close-btn {
    top: 8px;
    right: 8px;
  }
}

/* Very short screens */
@media (max-height: 600px) and (orientation: portrait) {
  :host {
    gap: clamp(0.75rem, 2vh, 1.5rem);
    padding-top: max(env(safe-area-inset-top, 10px), 60px);
    padding-bottom: max(env(safe-area-inset-bottom, 10px), 40px);
  }

  .clock-container {
    width: min(55vw, 55vh);
    height: min(55vw, 55vh);
  }

  .date-display {
    font-size: clamp(0.9rem, 3vw, 1.1rem);
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  :host([open]) .clock-container,
  :host([open]) .date-display {
    animation: none;
    opacity: 1;
  }
}
`;

function ClockModal({ host }) {
  // Signals for state management
  const time = useSignal(new Date());
  const isOpen = useSignal(false);
  const isIdle = useSignal(false);
  const greeting = useSignal('');

  // Computed values for clock hands
  const handRotations = useComputed(() => {
    const date = time.value;
    const hours = date.getHours() % 12;
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const milliseconds = date.getMilliseconds();

    return {
      hour: (hours + minutes / 60) * 30,
      minute: (minutes + seconds / 60) * 6,
      second: (seconds + milliseconds / 1000) * 6
    };
  });

  // Computed digital time string
  const digitalTime = useComputed(() => {
    return time.value.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  });

  // Clock animation effect - only runs when isOpen changes
  useEffect(() => {
    if (!isOpen.value) return;

    let animationFrame;
    const updateClock = () => {
      time.value = new Date();
      if (isOpen.value) {
        animationFrame = requestAnimationFrame(updateClock);
      }
    };

    updateClock();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isOpen.value]);

  // Navigation service subscription - runs once on mount
  useEffect(() => {
    const unsubscribe = navigationService.subscribe(() => {
      const isClockModal = navigationService.isModalPresented('clock');

      if (isClockModal && !isOpen.value) {
        isOpen.value = true;
        host.setAttribute('open', '');
        // Generate new greeting on open
        greeting.value = generateDateGreeting(new Date());
        host.dispatchEvent(new CustomEvent('open'));
        console.log('[ClockModal] Opened');
      } else if (!isClockModal && isOpen.value) {
        isOpen.value = false;
        host.removeAttribute('open');
        host.removeAttribute('idle');
        isIdle.value = false;
        host.dispatchEvent(new CustomEvent('close'));
        console.log('[ClockModal] Closed');
      }
    });

    return unsubscribe;
  }, []);

  // Idle tracking effect - only runs when isOpen changes
  useEffect(() => {
    if (!isOpen.value) return;

    let idleTimer;

    const handleMouseMove = () => {
      host.removeAttribute('idle');
      isIdle.value = false;

      // Reset idle timer
      if (idleTimer) {
        clearTimeout(idleTimer);
      }

      idleTimer = setTimeout(() => {
        if (isOpen.value) {
          host.setAttribute('idle', '');
          isIdle.value = true;
        }
      }, 3000); // 3 seconds
    };

    host.addEventListener('mousemove', handleMouseMove);
    handleMouseMove(); // Start timer immediately

    return () => {
      host.removeEventListener('mousemove', handleMouseMove);
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
    };
  }, [isOpen.value]);

  // Keyboard handler effect - only runs when isOpen changes
  useEffect(() => {
    if (!isOpen.value) return;

    const handleKeydown = (e) => {
      if (e.key === 'Escape' && isOpen.value) {
        e.preventDefault();
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeydown);

    // Focus close button
    requestAnimationFrame(() => {
      host.shadowRoot?.querySelector('.close-btn')?.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [isOpen.value]);

  const handleClose = () => {
    systemSounds.close();
    navigate.dismiss();
  };

  // Generate hour markers
  const generateHourMarkers = () => {
    const markers = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const innerRadius = 155;
      const outerRadius = 172;
      const x1 = 200 + innerRadius * Math.cos(angle);
      const y1 = 200 + innerRadius * Math.sin(angle);
      const x2 = 200 + outerRadius * Math.cos(angle);
      const y2 = 200 + outerRadius * Math.sin(angle);
      markers.push(html`<line class="hour-marker" x1=${x1} y1=${y1} x2=${x2} y2=${y2} />`);
    }
    return markers;
  };

  // Generate roman numerals
  const generateNumerals = () => {
    const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    const elements = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const radius = 130;
      const x = 200 + radius * Math.cos(angle);
      const y = 200 + radius * Math.sin(angle);
      elements.push(html`<text class="numeral" x=${x} y=${y}>${numerals[i]}</text>`);
    }
    return elements;
  };

  // Expose public API methods
  host.open = () => {
    systemSounds.open();
    navigationService.present('clock');
  };

  host.close = () => {
    systemSounds.close();
    navigationService.dismiss();
  };

  host.toggle = () => {
    isOpen.value ? host.close() : host.open();
  };

  if (!Object.getOwnPropertyDescriptor(host, 'isOpen')) {
    Object.defineProperty(host, 'isOpen', {
      configurable: true,
      get: () => isOpen.value
    });
  }

  return html`
    <${ErrorBoundary} name="ClockModal">
      <button
        class="close-btn"
        onClick=${handleClose}
        aria-label="Close clock"
        type="button"
      >
        <svg viewBox="0 0 24 24" fill="none">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>

      <div class="date-display">${greeting.value}</div>
      <handwrite-text
        class="handwrite-greeting"
        text=${greeting.value}
        color="oklch(1 0 0 / 0.85)"
        animate
      ></handwrite-text>

      <div class="clock-container">
        <svg class="clock-svg" viewBox="0 0 400 400">
          <!-- Clock face -->
          <circle class="clock-face" cx="200" cy="200" r="175" />

          <!-- Hour markers -->
          ${generateHourMarkers()}

          <!-- Roman numerals -->
          ${generateNumerals()}

          <!-- Clock hands -->
          <line
            class="hand hand-hour"
            x1="200" y1="200" x2="200" y2="100"
            style=${{ transform: `rotate(${handRotations.value.hour}deg)` }}
          />
          <line
            class="hand hand-minute"
            x1="200" y1="200" x2="200" y2="60"
            style=${{ transform: `rotate(${handRotations.value.minute}deg)` }}
          />
          <line
            class="hand hand-second"
            x1="200" y1="230" x2="200" y2="55"
            style=${{ transform: `rotate(${handRotations.value.second}deg)` }}
          />

          <!-- Center dot -->
          <circle class="center-dot" cx="200" cy="200" r="6" />
        </svg>
      </div>

      <div class="digital-time">${digitalTime.value}</div>
    <//>
  `;
}

export default createShadowComponent(ClockModal, {
  tag: 'clock-modal',
  styles,
});
