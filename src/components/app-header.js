/**
 * App Header Component
 * OS-style header with badge and clock
 */
import { html } from 'htm/preact';
import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { createShadowComponent } from '../lib/shadow-component.js';
import { ErrorBoundary } from '../lib/error-boundary.js';
import { chimes } from '../services/index.js';

const styles = `
  /* OS Header Component Styles */

  :host {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: var(--font-system, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
    font-size: var(--font-size-xs, 0.75rem);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-white-faint, rgba(255, 255, 255, 0.4));
    animation: fade-in 1s ease forwards;
  }

  .badge {
    border: 1px solid currentColor;
    padding: 0.35rem 0.75rem;
    border-radius: 20px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .badge:hover {
    border-color: var(--color-primary, #C84536);
    color: var(--color-primary, #C84536);
    background: rgba(200, 69, 54, 0.1);
  }

  .badge:active {
    transform: scale(0.95);
  }

  .clock {
    font-variant-numeric: tabular-nums;
    font-weight: 400;
    display: flex;
    align-items: center;
    gap: 1px;
    cursor: pointer;
    transition: color 0.2s ease;
  }

  .clock:hover {
    color: var(--color-white-soft, rgba(255, 255, 255, 0.85));
  }

  .clock:active {
    color: var(--color-white, #fff);
  }

  .hours,
  .minutes {
    display: inline-block;
  }

  .colon {
    display: inline-block;
    animation: colon-pulse 2s ease-in-out infinite;
    transform-origin: center;
  }

  /* Smooth futuristic pulse - breathes like it's alive */
  @keyframes colon-pulse {
    0%, 100% {
      opacity: 1;
      transform: scaleY(1);
    }
    25% {
      opacity: 0.3;
      transform: scaleY(0.8);
    }
    50% {
      opacity: 1;
      transform: scaleY(1);
    }
    75% {
      opacity: 0.3;
      transform: scaleY(0.8);
    }
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

function AppHeader({ host, badge = 'OS1' }) {
  const time = useSignal(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      time.value = new Date();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return { hours, minutes };
  };

  const handleClockClick = () => {
    chimes.clockTap();
    // Open the clock modal if it exists
    const clockModal = document.querySelector('clock-modal');
    if (clockModal) {
      clockModal.open();
    }
  };

  const handleBadgeClick = () => {
    // Open launchpad when badge is clicked
    const launchpad = document.querySelector('launchpad-view');
    if (launchpad) {
      launchpad.open();
    }
  };

  const { hours, minutes } = formatTime(time.value);

  return html`
    <${ErrorBoundary} name="AppHeader">
      <div class="badge" onClick=${handleBadgeClick}>${badge}</div>
      <time class="clock" onClick=${handleClockClick}>
        <span class="hours">${hours}</span>
        <span class="colon">:</span>
        <span class="minutes">${minutes}</span>
      </time>
    <//>
  `;
}

export default createShadowComponent(AppHeader, {
  tag: 'os-header',
  styles,
});
