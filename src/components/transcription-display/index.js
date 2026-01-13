/**
 * Transcription Display Component
 * Shows speech-to-text transcription results
 */
import { html } from 'htm/preact';
import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { createShadowComponent } from '../shared/shadow-component.js';
import { ErrorBoundary } from '../shared/error-boundary.js';

function TranscriptionDisplay({ host, interim }) {
  const text = useSignal('');
  const isInterim = useSignal(false);

  // Keep internal state in sync with observed attribute changes
  useEffect(() => {
    isInterim.value = interim !== undefined;
  }, [interim]);

  // Expose methods for external control
  host.update = (newText, interim = false) => {
    text.value = newText;
    isInterim.value = interim;
    // Update host attribute to match original behavior
    host.toggleAttribute('interim', interim);
  };

  host.clear = () => {
    text.value = '';
    isInterim.value = false;
    host.toggleAttribute('interim', false);
  };

  // Expose active property
  if (!Object.getOwnPropertyDescriptor(host, 'active')) {
    Object.defineProperty(host, 'active', {
      configurable: true,
      get() {
        return host.hasAttribute('active');
      },
      set(value) {
        host.toggleAttribute('active', Boolean(value));
      }
    });
  }

  if (!Object.getOwnPropertyDescriptor(host, 'interim')) {
    Object.defineProperty(host, 'interim', {
      configurable: true,
      get() {
        return host.hasAttribute('interim');
      },
      set(value) {
        host.toggleAttribute('interim', Boolean(value));
        isInterim.value = Boolean(value);
      }
    });
  }

  return html`
    <${ErrorBoundary} name="TranscriptionDisplay">
      <span class=${`text ${isInterim.value ? 'interim' : ''}`}>
        ${text.value || html`<slot></slot>`}
      </span>
    <//>
  `;
}

export default createShadowComponent(TranscriptionDisplay, {
  tag: 'transcription-display',
  styleUrl: new URL('./styles.css', import.meta.url).href,
  observedAttributes: ['active', 'interim'],
});
