/**
 * OS Header Component
 * Displays system badge and live clock with Preact + Signals
 */

import { html } from 'htm/preact';
import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { createShadowComponent } from '../shared/shadow-component.js';
import { ErrorBoundary } from '../shared/error-boundary.js';
import { chimes } from '../../services/index.js';

function OsHeader({ badge = 'OS1' }) {
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
    const clockModal = document.querySelector('clock-modal');
    if (clockModal) {
      clockModal.open();
    }
  };

  const handleBadgeClick = () => {
    const launchpad = document.querySelector('launchpad-view');
    if (launchpad) {
      launchpad.open();
    }
  };

  const { hours, minutes } = formatTime(time.value);

  return html`
    <${ErrorBoundary} name="OsHeader">
      <div class="badge" onClick=${handleBadgeClick}>${badge}</div>
      <time class="clock" onClick=${handleClockClick}>
        <span class="hours">${hours}</span>
        <span class="colon">:</span>
        <span class="minutes">${minutes}</span>
      </time>
    <//>
  `;
}

export default createShadowComponent(OsHeader, {
  tag: 'os-header',
  styleUrl: new URL('./styles.css', import.meta.url).href,
});
