/**
 * App Footer Component
 * Application footer with branding
 */
import { html } from 'htm/preact';
import { createShadowComponent } from '../lib/shadow-component.js';
import { ErrorBoundary } from '../lib/error-boundary.js';

const styles = `
  /* App Footer Component Styles */

  :host {
    display: block;
    text-align: right;
    color: var(--color-cream, #F5E6DC);
    animation: fade-in 1s ease forwards;
    animation-delay: 1.2s;
    opacity: 0;
    contain: content;
  }

  .title {
    font-family: var(--font-display, 'Bodoni Moda', 'Georgia', serif);
    font-size: 1.1rem;
    font-weight: 500;
    font-style: italic;
    margin-bottom: 0.15rem;
    color: var(--color-cream, #F5E6DC);
    text-decoration: none;
    display: block;
    cursor: pointer;
    transition: opacity 0.3s ease;
  }

  .title:hover {
    opacity: 0.7;
  }

  .tagline {
    font-family: var(--font-body, 'Cormorant Garamond', serif);
    font-size: 0.85rem;
    font-weight: 300;
    font-style: italic;
    color: var(--color-white-soft, rgba(255, 255, 255, 0.85));
    margin-bottom: 0.25rem;
  }

  .author {
    font-family: var(--font-body, 'Cormorant Garamond', serif);
    font-size: 0.75rem;
    font-weight: 300;
    font-style: italic;
    color: var(--color-white-faint, rgba(255, 255, 255, 0.4));
    text-decoration: none;
    display: block;
    cursor: pointer;
    transition: color 0.3s ease;
  }

  .author:hover {
    color: var(--color-white-soft, rgba(255, 255, 255, 0.85));
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 700px) {
    :host {
      text-align: center;
      padding: 1rem 0;
    }
  }

  @media (max-height: 650px) {
    :host {
      text-align: center;
      padding: 0.5rem 0;
    }

    .title { font-size: 1rem; }
    .tagline { font-size: 0.75rem; }
  }
`;

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
  styles,
});
