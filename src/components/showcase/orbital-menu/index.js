import { html } from 'htm/preact';
import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { createShadowComponent } from '../../shared/shadow-component.js';
import { ErrorBoundary } from '../../shared/error-boundary.js';

function OrbitalMenu({ host }) {
  const isExpanded = useSignal(false);

  const handleCoreClick = () => {
    isExpanded.value = !isExpanded.value;
    if (isExpanded.value) {
      host.setAttribute('expanded', '');
    } else {
      host.removeAttribute('expanded');
    }
  };

  useEffect(() => {
    const handleItemClick = (e) => {
      const item = e.target.closest('.orbital-item');
      if (item) {
        host.dispatchEvent(new CustomEvent('orbital-select', {
          detail: { 
            angle: item.dataset.angle,
            orbit: item.dataset.orbit 
          },
          bubbles: true
        }));
      }
    };

    const handleOutsideClick = (e) => {
      if (!host.contains(e.target) && isExpanded.value) {
        isExpanded.value = false;
        host.removeAttribute('expanded');
      }
    };

    host.addEventListener('click', handleItemClick);
    document.addEventListener('click', handleOutsideClick);

    return () => {
      host.removeEventListener('click', handleItemClick);
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  return html`
    <${ErrorBoundary} name="OrbitalMenu">
      <div class="orbital-container">
        <svg class="orbit-paths" viewBox="0 0 260 260">
          <circle class="orbit-path" cx="130" cy="130" r="80"/>
        </svg>
        <button class="orbital-core" type="button" onClick=${handleCoreClick}>
          <span class="core-icon">+</span>
          <div class="core-ring"></div>
          <div class="core-ring ring-2"></div>
        </button>
        <div class="orbital-items">
          <slot></slot>
        </div>
      </div>
    <//>
  `;
}

createShadowComponent(OrbitalMenu, { 
  tag: 'orbital-menu', 
  styleUrl: new URL('./styles.css', import.meta.url).href
});
