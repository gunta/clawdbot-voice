/**
 * Shadow Component Factory
 * Creates Preact components that render inside Shadow DOM with CSS containment
 */
import { render } from 'preact';
import { html } from 'htm/preact';

/**
 * Creates a custom element that renders a Preact component inside Shadow DOM
 * @param {Function} Component - Preact functional component
 * @param {Object} options - Configuration options
 * @param {string} options.styles - CSS styles to inject into shadow root
 * @param {string} options.tag - Custom element tag name to register
 * @returns {HTMLElement} Custom element class
 */
export function createShadowComponent(Component, options = {}) {
  const { styles = '', tag } = options;

  class ShadowElement extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._props = {};
    }

    connectedCallback() {
      this._render();
    }

    disconnectedCallback() {
      render(null, this.shadowRoot);
    }

    /**
     * Update component props and re-render
     * @param {Object} value - New props object
     */
    set props(value) {
      this._props = value;
      this._render();
    }

    get props() {
      return this._props;
    }

    /**
     * Observe attribute changes and convert to props
     */
    static get observedAttributes() {
      return [];
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue !== newValue) {
        this._props[name] = newValue;
        this._render();
      }
    }

    _render() {
      // Always include CSS containment in :host
      const containmentStyles = `
        :host {
          display: block;
          contain: content;
        }
        ${styles}
      `;

      render(html`
        <style>${containmentStyles}</style>
        <${Component} ...${this._props} host=${this} />
      `, this.shadowRoot);
    }
  }

  // Auto-register custom element if tag provided
  if (tag && !customElements.get(tag)) {
    customElements.define(tag, ShadowElement);
  }

  return ShadowElement;
}

/**
 * Helper to define multiple shadow components at once
 * @param {Object} components - Map of tag names to component configs
 */
export function defineShadowComponents(components) {
  for (const [tag, config] of Object.entries(components)) {
    createShadowComponent(config.component, { ...config, tag });
  }
}
