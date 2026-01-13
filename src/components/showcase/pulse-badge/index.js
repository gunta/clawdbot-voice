import { html } from 'htm/preact';
import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { createShadowComponent } from '../../shared/shadow-component.js';
import { ErrorBoundary } from '../../shared/error-boundary.js';

function PulseBadge({ host }) {
  const status = useSignal(host.getAttribute('status') || '');

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'status') {
          const newStatus = host.getAttribute('status') || '';
          status.value = newStatus;
          host.dispatchEvent(new CustomEvent('status-change', {
            detail: { status: newStatus },
            bubbles: true
          }));
        }
      });
    });

    observer.observe(host, { attributes: true });
    return () => observer.disconnect();
  }, []);

  return html`
    <${ErrorBoundary} name="PulseBadge">
      <div class="badge">
        <div class="badge-heartbeat"></div>
        <div class="badge-heartbeat delay"></div>
        <span class="badge-core"><slot></slot></span>
      </div>
    <//>
  `;
}

createShadowComponent(PulseBadge, { 
  tag: 'pulse-badge', 
  styleUrl: new URL('./styles.css', import.meta.url).href
});
