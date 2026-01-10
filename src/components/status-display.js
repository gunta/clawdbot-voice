/**
 * Status Display Component
 * Shows application status messages
 */
import { html } from 'htm/preact';
import { useSignal, useComputed, useSignalEffect } from '@preact/signals';
import { createShadowComponent } from '../lib/shadow-component.js';
import { ErrorBoundary } from '../lib/error-boundary.js';

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
  styleUrl: './src/components/styles/status-display.css',
});
