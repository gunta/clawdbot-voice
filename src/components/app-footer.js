/**
 * App Footer Component
 * Behavior only - template is in HTML via Declarative Shadow DOM
 */

export class AppFooter extends HTMLElement {
  // No behavior needed - purely presentational
  // All content comes from slots defined in HTML
}

customElements.define('app-footer', AppFooter);
