/**
 * Wave Form Component
 * Animated waveform visualization with bars
 */
import { html } from 'htm/preact';
import { useSignal, useSignalEffect } from '@preact/signals';
import { useRef, useEffect } from 'preact/hooks';
import { createShadowComponent } from '../lib/shadow-component.js';
import { ErrorBoundary } from '../lib/error-boundary.js';
import { audioAnalyzer } from '../services/audio-analyzer.js';

const styles = `
  /* Wave Form Component Styles */

  :host {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: var(--waveform-height, 40px);
    opacity: 0.3;
    transition: opacity 0.4s ease;
    contain: content;
  }

  :host([active]) {
    opacity: 1 !important;
    animation: none;
  }

  /* Initial fade-in animation (only when not active) */
  :host(:not([active])) {
    animation: fade-in 1s ease forwards;
    animation-delay: 0.5s;
    opacity: 0;
  }

  .bar {
    width: 3px;
    height: var(--wave-bar-height, 15px);
    background: var(--color-white, #FFFFFF);
    border-radius: 2px;
    transition: height 0.05s ease-out;
    will-change: height;
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 0.3; transform: translateY(0); }
  }

  @keyframes wave-move {
    0%, 100% { height: var(--wave-bar-height, 15px); }
    50% { height: var(--wave-bar-height-active, 35px); }
  }

  @media (max-width: 700px) {
    :host {
      height: 30px;
    }
  }
`;

function WaveForm({ host, bars = 7 }) {
  const isActive = useSignal(false);
  const barCount = parseInt(bars) || 7;
  const barRefs = useRef([]);

  // Handle audio levels
  useEffect(() => {
    const handleLevels = (e) => {
      if (!isActive.value) return;

      const { levels } = e.detail;
      const bars = barRefs.current;

      if (!bars.length) return;

      bars.forEach((bar, index) => {
        if (!bar) return;

        // Map bar index to frequency bands (mirror for symmetric look)
        const centerIndex = Math.floor(bars.length / 2);
        const distance = Math.abs(index - centerIndex);
        const bandIndex = Math.min(distance, levels.length - 1);
        const level = levels[bandIndex];

        // Calculate height based on level (15px to 45px)
        const minHeight = 15;
        const maxHeight = 45;
        const height = minHeight + level * (maxHeight - minHeight);

        bar.style.height = `${height}px`;
      });
    };

    audioAnalyzer.addEventListener('levels', handleLevels);
    return () => {
      audioAnalyzer.removeEventListener('levels', handleLevels);
    };
  }, [isActive.value]);

  // Reset bars when becoming inactive
  useSignalEffect(() => {
    if (!isActive.value) {
      barRefs.current.forEach(bar => {
        if (bar) bar.style.height = '';
      });
    }
  });

  // Expose methods and sync active attribute
  useEffect(() => {
    host.start = () => {
      isActive.value = true;
      host.setAttribute('active', '');
    };
    host.stop = () => {
      isActive.value = false;
      host.removeAttribute('active');
    };

    // Sync with attribute
    if (host.hasAttribute('active')) {
      isActive.value = true;
    }
  }, []);

  return html`
    <${ErrorBoundary} name="WaveForm">
      ${Array.from({ length: barCount }, (_, i) => html`
        <div
          key=${i}
          class="bar"
          ref=${(el) => { barRefs.current[i] = el; }}
        ></div>
      `)}
    <//>
  `;
}

export default createShadowComponent(WaveForm, {
  tag: 'wave-form',
  styles,
  observedAttributes: ['active', 'bars'],
});
