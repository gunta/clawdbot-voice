import { html } from 'htm/preact';
import { createShadowComponent } from '../../shared/shadow-component.js';
import { ErrorBoundary } from '../../shared/error-boundary.js';

function HologramAvatar({ host }) {
  return html`
    <${ErrorBoundary} name="HologramAvatar">
      <div class="holo-container">
        <div class="holo-projection">
          <div class="holo-image">
            <slot>
              <svg class="default-avatar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
              </svg>
            </slot>
          </div>
          <div class="holo-scanlines"></div>
        </div>
        <div class="holo-base">
          <div class="base-ring"></div>
        </div>
        <div class="status-indicator"></div>
      </div>
    <//>
  `;
}

createShadowComponent(HologramAvatar, { 
  tag: 'hologram-avatar', 
  styleUrl: new URL('./styles.css', import.meta.url).href
});
