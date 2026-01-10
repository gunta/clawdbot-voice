/**
 * Shadow Component Factory
 * Creates Preact components that render inside Shadow DOM with CSS containment
 */
import { render } from 'preact';
import { html } from 'htm/preact';

/** Cache for loaded stylesheets to avoid refetching */
const styleSheetCache = new Map();

/**
 * Load a stylesheet and cache it
 * @param {string} url - URL of the CSS file
 * @returns {Promise<CSSStyleSheet>}
 */
async function loadStyleSheet(url) {
  if (styleSheetCache.has(url)) {
    return styleSheetCache.get(url);
  }
  
  const response = await fetch(url);
  const cssText = await response.text();
  const sheet = new CSSStyleSheet();
  await sheet.replace(cssText);
  styleSheetCache.set(url, sheet);
  return sheet;
}

/** Base styles applied to all shadow components */
const baseStyles = new CSSStyleSheet();
baseStyles.replaceSync(`
  :host {
    display: block;
    contain: content;
  }
`);

/**
 * Creates a custom element that renders a Preact component inside Shadow DOM
 * @param {Function} Component - Preact functional component
 * @param {Object} options - Configuration options
 * @param {string} [options.styles] - Inline CSS styles to inject (legacy)
 * @param {string} [options.styleUrl] - URL to CSS file (preferred for syntax highlighting)
 * @param {string} options.tag - Custom element tag name to register
 * @returns {HTMLElement} Custom element class
 */
export function createShadowComponent(Component, options = {}) {
  const { styles = '', styleUrl, tag } = options;

  // If inline styles provided, create a stylesheet for them
  let inlineSheet = null;
  if (styles) {
    inlineSheet = new CSSStyleSheet();
    inlineSheet.replaceSync(styles);
  }

  class ShadowElement extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._props = {};
      this._stylesLoaded = false;
    }

    async connectedCallback() {
      // Apply base styles immediately
      this.shadowRoot.adoptedStyleSheets = [baseStyles];
      
      if (styleUrl) {
        // Load external stylesheet
        try {
          const sheet = await loadStyleSheet(styleUrl);
          this.shadowRoot.adoptedStyleSheets = [baseStyles, sheet];
        } catch (e) {
          console.warn(`[ShadowComponent] Failed to load styles from ${styleUrl}:`, e);
        }
      } else if (inlineSheet) {
        // Use inline styles
        this.shadowRoot.adoptedStyleSheets = [baseStyles, inlineSheet];
      }
      
      this._stylesLoaded = true;
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
      render(html`
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
