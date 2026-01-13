import { html } from 'htm/preact';
import { useEffect } from 'preact/hooks';
import { createShadowComponent } from '../../shared/shadow-component.js';
import { ErrorBoundary } from '../../shared/error-boundary.js';

function RippleList({ host }) {
  useEffect(() => {
    const handleMouseEnter = (e) => {
      const item = e.target.closest('.ripple-item');
      if (item) {
        const items = Array.from(host.querySelectorAll('.ripple-item'));
        const index = items.indexOf(item);
        host.setAttribute('ripple-from', index.toString());
      }
    };

    const handleMouseLeave = () => {
      host.removeAttribute('ripple-from');
    };

    host.addEventListener('mouseenter', handleMouseEnter, true);
    host.addEventListener('mouseleave', handleMouseLeave, true);

    return () => {
      host.removeEventListener('mouseenter', handleMouseEnter, true);
      host.removeEventListener('mouseleave', handleMouseLeave, true);
    };
  }, []);

  return html`
    <${ErrorBoundary} name="RippleList">
      <div class="ripple-container">
        <svg class="connection-lines" preserveAspectRatio="none">
          <path class="conn-path" d="M1 0 V100%"/>
        </svg>
        <slot></slot>
      </div>
    <//>
  `;
}

createShadowComponent(RippleList, { 
  tag: 'ripple-list', 
  styleUrl: new URL('./styles.css', import.meta.url).href
});
