/**
 * Launchpad View Component
 * Full-screen app launcher with Her aesthetic
 * Behavior only - template is in HTML via Declarative Shadow DOM
 */

import { appContext, systemSounds } from '../services/index.js';

export class LaunchpadView extends HTMLElement {
  #closeBtn = null;
  #appsGrid = null;
  #boundHandleKeyDown = null;

  connectedCallback() {
    this.#closeBtn = this.shadowRoot?.querySelector('.close-btn');
    this.#appsGrid = this.shadowRoot?.querySelector('.apps-grid');
    
    // Close button handler
    this.#closeBtn?.addEventListener('click', () => this.close());
    
    // App card click handlers
    this.#appsGrid?.querySelectorAll('.app-card').forEach(card => {
      card.addEventListener('click', (e) => this.#handleAppClick(e));
    });
    
    // Keyboard navigation
    this.#boundHandleKeyDown = this.#handleKeyDown.bind(this);
    
    // Note: Removed "click outside to close" - was causing issues with shadow DOM event retargeting
    // Users can close via the close button or Escape key
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this.#boundHandleKeyDown);
  }

  /**
   * Open the launchpad
   */
  open() {
    this.setAttribute('open', '');
    document.addEventListener('keydown', this.#boundHandleKeyDown);
    
    // Play open sound
    systemSounds.open();
    
    // Focus first app card for accessibility
    requestAnimationFrame(() => {
      const firstCard = this.#appsGrid?.querySelector('.app-card');
      firstCard?.focus();
    });
    
    // Dispatch event
    this.dispatchEvent(new CustomEvent('launchpad-open', { bubbles: true }));
  }

  /**
   * Close the launchpad
   */
  close() {
    this.removeAttribute('open');
    document.removeEventListener('keydown', this.#boundHandleKeyDown);
    
    // Play close sound
    systemSounds.close();
    
    // Dispatch event
    this.dispatchEvent(new CustomEvent('launchpad-close', { bubbles: true }));
  }

  /**
   * Toggle open/close
   */
  toggle() {
    if (this.hasAttribute('open')) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Handle keyboard events
   */
  #handleKeyDown(e) {
    if (e.key === 'Escape') {
      this.close();
    }
  }

  /**
   * Handle app card click
   */
  #handleAppClick(e) {
    const card = e.currentTarget;
    const appId = card.dataset.app;
    
    if (!appId) return;
    
    // Play launch sound
    systemSounds.launch();
    
    // Record app launch in context
    appContext.recordAction('launchpad', 'launch-app', { appId });
    appContext.setActiveApp(appId);
    
    // Dispatch app launch event
    this.dispatchEvent(new CustomEvent('app-launch', {
      bubbles: true,
      detail: { appId }
    }));
    
    // If it's the voice app (current view), just close launchpad
    if (appId === 'voice') {
      this.close();
      return;
    }
    
    // For other apps, show them and close launchpad
    this.#launchApp(appId);
  }

  /**
   * Launch an app
   */
  #launchApp(appId) {
    // Get the app component
    const appElement = document.querySelector(`${appId}-app`);
    
    if (appElement && typeof appElement.open === 'function') {
      appElement.open();
    }
    
    this.close();
  }

  /**
   * Check if launchpad is open
   */
  get isOpen() {
    return this.hasAttribute('open');
  }
}

customElements.define('launchpad-view', LaunchpadView);
