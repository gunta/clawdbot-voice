import { html } from 'htm/preact';
import { useSignal } from '@preact/signals';
import { createShadowComponent } from '../../shared/shadow-component.js';
import { ErrorBoundary } from '../../shared/error-boundary.js';

function PhaseToggle({ host }) {
  const checked = useSignal(false);

  const handleClick = () => {
    checked.value = !checked.value;
    
    host.setAttribute('transitioning', '');
    setTimeout(() => host.removeAttribute('transitioning'), 500);

    host.dispatchEvent(new CustomEvent('toggle', {
      detail: { checked: checked.value },
      bubbles: true
    }));
  };

  return html`
    <${ErrorBoundary} name="PhaseToggle">
      <button 
        class="phase-toggle" 
        type="button"
        role="switch"
        aria-checked=${checked.value}
        onClick=${handleClick}
      >
        <div class="phase-track"></div>
        <div class="phase-thumb">
          <div class="thumb-core"></div>
        </div>
        <div class="phase-labels">
          <span class="label-off">OFF</span>
          <span class="label-on">ON</span>
        </div>
      </button>
    <//>
  `;
}

createShadowComponent(PhaseToggle, { 
  tag: 'phase-toggle', 
  styleUrl: new URL('./styles.css', import.meta.url).href
});
