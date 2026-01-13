import { html } from 'htm/preact';
import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { createShadowComponent } from '../../shared/shadow-component.js';
import { ErrorBoundary } from '../../shared/error-boundary.js';

function MembraneModal({ host }) {
  const isOpen = useSignal(false);

  const open = () => {
    isOpen.value = true;
    host.setAttribute('open', '');
    host.setAttribute('opening', '');
    setTimeout(() => host.removeAttribute('opening'), 600);
    document.body.style.overflow = 'hidden';
  };

  const close = () => {
    host.setAttribute('closing', '');
    setTimeout(() => {
      isOpen.value = false;
      host.removeAttribute('open');
      host.removeAttribute('closing');
      document.body.style.overflow = '';
    }, 400);
  };

  useEffect(() => {
    const handleKeydown = (e) => {
      if (e.key === 'Escape' && isOpen.value) {
        close();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    
    // Expose methods
    host.open = open;
    host.close = close;

    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);

  const handleSurfaceClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    host.style.setProperty('--touch-x', `${e.clientX - rect.left}px`);
    host.style.setProperty('--touch-y', `${e.clientY - rect.top}px`);
    host.setAttribute('touched', '');
    setTimeout(() => host.removeAttribute('touched'), 600);
  };

  return html`
    <${ErrorBoundary} name="MembraneModal">
      <div class="membrane-backdrop">
        <div class="membrane-surface" onClick=${handleSurfaceClick}>
          <button class="membrane-close" type="button" onClick=${close}>
            <span class="close-x">×</span>
            <div class="close-ring"></div>
          </button>
          <div class="membrane-content">
            <slot></slot>
          </div>
        </div>
      </div>
    <//>
  `;
}

createShadowComponent(MembraneModal, { 
  tag: 'membrane-modal', 
  styleUrl: new URL('./styles.css', import.meta.url).href
});
