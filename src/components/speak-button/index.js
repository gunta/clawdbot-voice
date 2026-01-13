/**
 * Speak Button Component
 * Main interaction button for voice input
 */
import { html } from 'htm/preact';
import { useComputed, useSignal, useSignalEffect } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { createShadowComponent } from '../shared/shadow-component.js';
import { ErrorBoundary } from '../shared/error-boundary.js';
import { haptic } from '../../services/haptic.js';

function SpeakButton({ host, listening: listeningAttr, disabled: disabledAttr }) {
  const defaultText = useSignal('tap to speak');
  const listening = useSignal(false);
  const disabled = useSignal(false);
  const prevListeningRef = useRef(false);

  // Derive display text from state
  const buttonText = useComputed(() => (listening.value ? 'listening...' : defaultText.value));

  // Initialize default text from host's light DOM once
  useEffect(() => {
    const initial = host.textContent?.trim();
    if (initial) defaultText.value = initial;
  }, []);

  // Keep internal state in sync with observed attributes
  useEffect(() => {
    listening.value = listeningAttr !== undefined;
  }, [listeningAttr]);

  useEffect(() => {
    disabled.value = disabledAttr !== undefined;
  }, [disabledAttr]);

  // Haptic feedback on listening start
  useSignalEffect(() => {
    const isListening = listening.value;
    if (isListening && !prevListeningRef.current) {
      haptic('success'); // Started listening
    }
    prevListeningRef.current = isListening;
  });

  const handleTouchStart = () => {
    haptic('light');
  };

  const handleClick = () => {
    if (disabled.value) return;

    // Haptic feedback on activation
    haptic('medium');

    // Dispatch custom event for parent to handle
    host.dispatchEvent(new CustomEvent('speak-toggle', {
      bubbles: true,
      composed: true,
    }));
  };

  // Expose properties to host element for compatibility
  if (!Object.getOwnPropertyDescriptor(host, 'listening')) {
    Object.defineProperty(host, 'listening', {
      configurable: true,
      get: () => listening.value,
      set: (value) => {
        const next = Boolean(value);
        listening.value = next;
        host.toggleAttribute('listening', next);
      },
    });
  }

  if (!Object.getOwnPropertyDescriptor(host, 'disabled')) {
    Object.defineProperty(host, 'disabled', {
      configurable: true,
      get: () => disabled.value,
      set: (value) => {
        const next = Boolean(value);
        disabled.value = next;
        host.toggleAttribute('disabled', next);
      },
    });
  }

  return html`
    <${ErrorBoundary} name="SpeakButton">
      <button
        type="button"
        class=${listening.value ? 'listening' : ''}
        disabled=${disabled.value}
        onTouchStart=${handleTouchStart}
        onClick=${handleClick}
      >
        <span class="text">${buttonText}</span>
        <div class="ripple"></div>
      </button>
    <//>
  `;
}

const speakButtonOptions = {
  tag: 'speak-button',
  styleUrl: new URL('./styles.css', import.meta.url).href,
  observedAttributes: ['listening', 'disabled'],
};

export default createShadowComponent(SpeakButton, speakButtonOptions);
