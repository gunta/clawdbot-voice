/**
 * CLAWD OS1 Main Shell
 * Root component orchestrating navigation and app rendering
 */
import { html } from 'htm/preact';
import { useComputed } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { createShadowComponent } from '../lib/shadow-component.js';
import { ErrorBoundary } from '../lib/error-boundary.js';
import {
  currentApp,
  modalStack,
  navigate,
  initNavigationSignals,
  transitionDirection
} from '../services/navigation-signals.js';

const styles = `
  :host {
    display: block;
    contain: content;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }

  .app-container {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .app-view {
    position: absolute;
    inset: 0;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, transform 0.3s ease;
  }

  .app-view.active {
    opacity: 1;
    visibility: visible;
  }

  .app-view.slide-in-right {
    transform: translateX(100%);
  }

  .app-view.slide-in-right.active {
    transform: translateX(0);
  }

  .modal-layer {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 100;
  }

  .modal-layer > * {
    pointer-events: auto;
  }

  .crash-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
    text-align: center;
    background: var(--background, #1a1a1a);
    color: var(--text, #fff);
  }

  .crash-screen h1 {
    color: #ff3b30;
    margin-bottom: 1rem;
  }

  .crash-screen button {
    margin-top: 1rem;
    padding: 0.75rem 1.5rem;
    background: #ff3b30;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }
`;

// App component mapping for dynamic loading
const APP_COMPONENTS = {
  voice: 'voice-view',
  launchpad: 'launchpad-view',
  files: 'files-app',
  commands: 'commands-app',
  coder: 'coder-app',
  settings: 'settings-app',
  'image-viewer': 'image-viewer-app',
};

function ClawdOS1Shell({ host }) {
  const app = useComputed(() => currentApp.value?.id || 'voice');
  const modals = useComputed(() => modalStack.value || []);
  const direction = useComputed(() => transitionDirection.value);

  useEffect(() => {
    // Initialize navigation signals when shell mounts
    initNavigationSignals();
  }, []);

  const getAppElement = (appId) => {
    const tagName = APP_COMPONENTS[appId];
    if (!tagName) return null;
    return html`<${tagName} class="app-view active" />`;
  };

  return html`
    <div class="app-container">
      <${ErrorBoundary}
        name="AppShell"
        fallback=${({ error, retry }) => html`
          <div class="crash-screen">
            <h1>App Crashed</h1>
            <pre>${error?.message || 'Unknown error'}</pre>
            <button onClick=${() => { navigate.push({ id: 'voice' }); retry(); }}>
              Go Home
            </button>
          </div>
        `}
      >
        ${getAppElement(app.value)}
      <//>

      <div class="modal-layer">
        ${modals.value.map(modal => html`
          <${ErrorBoundary} key=${modal.id} name=${`Modal-${modal.id}`}>
            ${getAppElement(modal.id)}
          <//>
        `)}
      </div>
    </div>
  `;
}

export default createShadowComponent(ClawdOS1Shell, {
  tag: 'clawd-os1',
  styles,
});
