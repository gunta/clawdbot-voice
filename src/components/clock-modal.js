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
  styleUrl: './src/components/styles/clock-modal.css',
});
