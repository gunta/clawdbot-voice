import { html } from 'htm/preact';
import { createShadowComponent } from '../../shared/shadow-component.js';
import { ErrorBoundary } from '../../shared/error-boundary.js';

function EchoTooltip({ host }) {
  const message = host.getAttribute('message') || '';

  return html`
    <${ErrorBoundary} name="EchoTooltip">
      <div class="echo-trigger" tabindex="0">
        <slot></slot>
        <div class="echo-bubble">
          <span class="echo-text">${message}</span>
        </div>
      </div>
    <//>
  `;
}

createShadowComponent(EchoTooltip, { 
  tag: 'echo-tooltip', 
  styleUrl: new URL('./styles.css', import.meta.url).href
});
