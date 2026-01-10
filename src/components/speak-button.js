/**
 * Speak Button Component
 * Main interaction button for voice input
 */
import { html } from 'htm/preact';
import { signal, useSignalEffect } from '@preact/signals';
import { createShadowComponent } from '../lib/shadow-component.js';
import { ErrorBoundary } from '../lib/error-boundary.js';
import { haptic } from '../services/haptic.js';

function SpeakButton({ host }) {
  const buttonText = signal('tap to speak');
  const listening = signal(false);
  const disabled = signal(false);
  const defaultText = signal('tap to speak');

  // Initialize default text from host's textContent
  if (host.textContent?.trim()) {
    defaultText.value = host.textContent.trim();
    buttonText.value = defaultText.value;
  }

  // Watch for listening state changes and provide haptic feedback
  let previousListening = false;
  useSignalEffect(() => {
    const isListening = listening.value;
    buttonText.value = isListening ? 'listening...' : defaultText.value;

    // Haptic feedback on state change
    if (isListening && !previousListening) {
      haptic('success'); // Started listening
    }
    previousListening = isListening;
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
        listening.value = Boolean(value);
        if (value) {
          host.setAttribute('listening', '');
        } else {
          host.removeAttribute('listening');
        }
      },
    });
  }

  if (!Object.getOwnPropertyDescriptor(host, 'disabled')) {
    Object.defineProperty(host, 'disabled', {
      configurable: true,
      get: () => disabled.value,
      set: (value) => {
        disabled.value = Boolean(value);
        if (value) {
          host.setAttribute('disabled', '');
        } else {
          host.removeAttribute('disabled');
        }
      },
    });
  }

  // Watch for attribute changes
  const attributeObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes') {
        const attrName = mutation.attributeName;
        if (attrName === 'listening') {
          listening.value = host.hasAttribute('listening');
        } else if (attrName === 'disabled') {
          disabled.value = host.hasAttribute('disabled');
        }
      }
    });
  });

  attributeObserver.observe(host, { attributes: true });

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

export default createShadowComponent(SpeakButton, {
  tag: 'speak-button',
  styleUrl: './src/components/styles/speak-button.css',
  observedAttributes: ['listening', 'disabled'],
});
