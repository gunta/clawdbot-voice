/**
 * App Header Component
 * Reusable navigation header with Back/Forward/Close/Title
 * 
 * Usage:
 *   <app-header title="Files"></app-header>
 * 
 * Attributes:
 *   - title: Display title
 *   - can-back: Enable back button (set by navigation service)
 *   - can-forward: Enable forward button (set by navigation service)
 *   - no-navigation: Hide back/forward buttons (for modals)
 * 
 * Events:
 *   - 'back': User clicked back button
 *   - 'forward': User clicked forward button
 *   - 'close': User clicked close button
 */

import { navigationService } from '../services/navigation-service.js';

export class AppHeader extends HTMLElement {
  #unsubscribe = null;

  static get observedAttributes() {
    return ['title', 'can-back', 'can-forward', 'no-navigation'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.#render();
    this.#bindEvents();
    this.#subscribeToNavigation();
  }

  disconnectedCallback() {
    if (this.#unsubscribe) {
      this.#unsubscribe();
      this.#unsubscribe = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.#updateUI();
    }
  }

  #render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --header-height: 48px;
          --header-bg: oklch(0.15 0.01 250);
          --header-border: oklch(0.25 0.01 250);
          --text-primary: oklch(0.95 0 0);
          --text-secondary: oklch(0.6 0 0);
          --btn-hover: oklch(0.25 0.02 250);
          --btn-disabled: oklch(0.4 0 0);
          --accent: oklch(0.75 0.15 30);
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: var(--header-height);
          padding: 0 12px;
          background: var(--header-bg);
          border-bottom: 1px solid var(--header-border);
          user-select: none;
          -webkit-user-select: none;
        }

        .nav-group {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .nav-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          padding: 0;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--text-primary);
          cursor: pointer;
          transition: background 0.15s ease, opacity 0.15s ease;
        }

        .nav-btn:hover:not(:disabled) {
          background: var(--btn-hover);
        }

        .nav-btn:active:not(:disabled) {
          transform: scale(0.95);
        }

        .nav-btn:disabled {
          color: var(--btn-disabled);
          cursor: not-allowed;
          opacity: 0.5;
        }

        .nav-btn svg {
          width: 20px;
          height: 20px;
          stroke: currentColor;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
        }

        .title-area {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 0;
        }

        .title {
          font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 15px;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          letter-spacing: 0.01em;
        }

        .close-group {
          display: flex;
          align-items: center;
        }

        .close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          padding: 0;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .close-btn:hover {
          background: var(--btn-hover);
          color: var(--accent);
        }

        .close-btn:active {
          transform: scale(0.95);
        }

        .close-btn svg {
          width: 18px;
          height: 18px;
          stroke: currentColor;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
        }

        /* Hide navigation when no-navigation attribute is set */
        :host([no-navigation]) .nav-group {
          visibility: hidden;
        }

        /* Responsive adjustments */
        @media (max-width: 480px) {
          .header {
            padding: 0 8px;
          }
          
          .nav-btn,
          .close-btn {
            width: 32px;
            height: 32px;
          }

          .title {
            font-size: 14px;
          }
        }
      </style>

      <div class="header">
        <div class="nav-group">
          <button class="nav-btn back-btn" type="button" aria-label="Go back" disabled>
            <svg viewBox="0 0 24 24">
              <path d="M15 18L9 12L15 6" />
            </svg>
          </button>
          <button class="nav-btn forward-btn" type="button" aria-label="Go forward" disabled>
            <svg viewBox="0 0 24 24">
              <path d="M9 18L15 12L9 6" />
            </svg>
          </button>
        </div>

        <div class="title-area">
          <span class="title"></span>
        </div>

        <div class="close-group">
          <button class="close-btn" type="button" aria-label="Close">
            <svg viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  #bindEvents() {
    const backBtn = this.shadowRoot.querySelector('.back-btn');
    const forwardBtn = this.shadowRoot.querySelector('.forward-btn');
    const closeBtn = this.shadowRoot.querySelector('.close-btn');

    backBtn?.addEventListener('click', () => {
      if (!backBtn.disabled) {
        this.dispatchEvent(new CustomEvent('back', { bubbles: true }));
        navigationService.back();
      }
    });

    forwardBtn?.addEventListener('click', () => {
      if (!forwardBtn.disabled) {
        this.dispatchEvent(new CustomEvent('forward', { bubbles: true }));
        navigationService.forward();
      }
    });

    closeBtn?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('close', { bubbles: true }));
      navigationService.close();
    });
  }

  #subscribeToNavigation() {
    this.#unsubscribe = navigationService.subscribe(() => {
      this.#updateNavigationState();
    });
  }

  #updateNavigationState() {
    const backBtn = this.shadowRoot.querySelector('.back-btn');
    const forwardBtn = this.shadowRoot.querySelector('.forward-btn');

    // Hide buttons when not available instead of disabling
    if (backBtn) {
      backBtn.style.display = navigationService.canGoBack ? '' : 'none';
    }
    if (forwardBtn) {
      forwardBtn.style.display = navigationService.canGoForward ? '' : 'none';
    }
  }

  #updateUI() {
    const titleEl = this.shadowRoot.querySelector('.title');
    if (titleEl) {
      titleEl.textContent = this.getAttribute('title') || '';
    }
  }

  // Public API
  get title() {
    return this.getAttribute('title') || '';
  }

  set title(value) {
    this.setAttribute('title', value);
  }
}

customElements.define('app-header', AppHeader);
