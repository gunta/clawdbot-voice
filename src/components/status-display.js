/**
 * Status Display Component
 * Shows application status messages
 */
import { html } from 'htm/preact';
import { useSignal, useComputed, useSignalEffect } from '@preact/signals';
import { createShadowComponent } from '../lib/shadow-component.js';
import { ErrorBoundary } from '../lib/error-boundary.js';

const styles = `
  /* Status Display Component Styles */

  :host {
    display: block;
    contain: content;
    text-align: center;
    animation: fade-in 1s ease forwards;
    animation-delay: 1s;
    opacity: 0;
  }

  .text {
    font-family: var(--font-body, 'Cormorant Garamond', serif);
    font-size: 0.85rem;
    font-weight: 300;
    font-style: italic;
    color: var(--color-white-faint, rgba(255, 255, 255, 0.4));
    letter-spacing: 0.15em;
    text-transform: lowercase;
    transition: color 0.3s ease;
  }

  :host([active]) .text {
    color: var(--color-white-soft, rgba(255, 255, 255, 0.85));
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

function StatusDisplay({ host }) {
  const text = useSignal('ready');

  // Computed signal to determine if active (not 'ready')
  const active = useComputed(() => text.value !== 'ready');

  // Update the host attribute when active state changes
  useSignalEffect(() => {
    if (active.value) {
      host.setAttribute('active', '');
    } else {
      host.removeAttribute('active');
    }
  });

  // Method to update status text (called externally)
  host.update = (newText) => {
    text.value = newText;
  };

  // Expose status property for compatibility
  if (!Object.getOwnPropertyDescriptor(host, 'status')) {
    Object.defineProperty(host, 'status', {
      configurable: true,
      get() {
        return text.value;
      },
      set(value) {
        text.value = value;
      },
    });
  }

  return html`
    <${ErrorBoundary} name="StatusDisplay">
      <span class="text">${text}</span>
    <//>
  `;
}

export default createShadowComponent(StatusDisplay, {
  tag: 'status-display',
  styles,
});
