/**
 * App Footer Component
 * Application footer with branding
 */
import { html } from 'htm/preact';
import { createShadowComponent } from '../lib/shadow-component.js';
import { ErrorBoundary } from '../lib/error-boundary.js';

function AppFooter({ host }) {
  return html`
    <${ErrorBoundary} name="AppFooter">
      <a class="title" href="https://clawdbot.com/" target="_blank" rel="noopener">
        <slot name="title">Clawd</slot>
      </a>
      <div class="tagline"><slot name="tagline">a voice experience</slot></div>
      <a class="author" href="https://x.com/gunta85" target="_blank" rel="noopener">
        <slot name="author">by gunta</slot>
      </a>
    <//>
  `;
}

export default createShadowComponent(AppFooter, {
  tag: 'app-footer',
  styleUrl: './src/components/styles/app-footer.css',
});
