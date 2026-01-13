import { html } from 'htm/preact';
import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { createShadowComponent } from '../../shared/shadow-component.js';
import { ErrorBoundary } from '../../shared/error-boundary.js';

function BreathButton({ host }) {
  const proximity = useSignal('');

  useEffect(() => {
    const handleMouseMove = (e) => {
      const rect = host.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.hypot(e.clientX - centerX, e.clientY - centerY);

      if (distance < 50) {
        proximity.value = 'close';
        host.setAttribute('proximity', 'close');
      } else if (distance < 150) {
        proximity.value = 'near';
        host.setAttribute('proximity', 'near');
      } else {
        proximity.value = '';
        host.removeAttribute('proximity');
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleClick = () => {
    host.dispatchEvent(new CustomEvent('breath-click', { bubbles: true }));
  };

  return html`
    <${ErrorBoundary} name="BreathButton">
      <button class="breath-btn" type="button" onClick=${handleClick}>
        <div class="breath-membrane"></div>
        <div class="breath-inner">
          <span class="breath-text"><slot></slot></span>
        </div>
      </button>
    <//>
  `;
}

createShadowComponent(BreathButton, { 
  tag: 'breath-button', 
  styleUrl: new URL('./styles.css', import.meta.url).href
});
