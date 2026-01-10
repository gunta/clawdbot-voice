/**
 * Transcription Display Component
 * Shows speech-to-text transcription results
 */
import { html } from 'htm/preact';
import { useSignal } from '@preact/signals';
import { createShadowComponent } from '../lib/shadow-component.js';
import { ErrorBoundary } from '../lib/error-boundary.js';

const styles = `
  /* Transcription Display Component Styles */

  :host {
    display: block;
    contain: content;
    min-height: 3rem;
    max-width: 320px;
    text-align: center;
    animation: fade-in 1s ease forwards;
    animation-delay: 0.6s;
    opacity: 0;
  }

  .text {
    font-family: var(--font-body, 'Cormorant Garamond', serif);
    font-size: 1.1rem;
    font-weight: 300;
    font-style: italic;
    color: var(--color-white-soft, rgba(255, 255, 255, 0.85));
    line-height: 1.5;
    display: block;
  }

  :host([active]) .text {
    color: var(--color-white, #FFFFFF);
  }

  .text.interim {
    opacity: 0.7;
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 700px) {
    :host {
      max-width: 280px;
      min-height: 2.5rem;
    }

    .text {
      font-size: 1rem;
    }
  }
`;

function TranscriptionDisplay({ host }) {
  const text = useSignal('');
  const isInterim = useSignal(false);

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
  styles,
  observedAttributes: ['active', 'interim'],
});
