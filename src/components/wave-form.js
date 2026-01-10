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
  styleUrl: './src/components/styles/wave-form.css',
  observedAttributes: ['active', 'bars'],
});
