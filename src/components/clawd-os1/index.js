/**
 * CLAWD OS1 Main Shell
 * Root component orchestrating navigation and app rendering
 */
import { html } from 'htm/preact';
import { useComputed } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { createShadowComponent } from '../shared/shadow-component.js';
import { ErrorBoundary } from '../shared/error-boundary.js';
import {
  currentApp,
  modalStack,
  navigate,
  initNavigationSignals,
  transitionDirection
} from '../../services/navigation-signals.js';

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
  styleUrl: new URL('./styles.css', import.meta.url).href,
});
