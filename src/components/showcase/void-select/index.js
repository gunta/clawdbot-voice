import { html } from 'htm/preact';
import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { createShadowComponent } from '../../shared/shadow-component.js';
import { ErrorBoundary } from '../../shared/error-boundary.js';

function VoidSelect({ host }) {
  const isOpen = useSignal(false);
  const selectedText = useSignal(host.getAttribute('placeholder') || 'Select...');

  const handleTriggerClick = () => {
    isOpen.value = !isOpen.value;
    if (isOpen.value) {
      host.setAttribute('open', '');
    } else {
      host.removeAttribute('open');
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!host.contains(e.target) && isOpen.value) {
        isOpen.value = false;
        host.removeAttribute('open');
      }
    };

    const handleOptionClick = (e) => {
      const option = e.target.closest('[data-value]');
      if (option) {
        const value = option.dataset.value;
        const text = option.textContent;

        host.setAttribute('selecting', '');
        host.querySelectorAll('[data-value]').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');

        setTimeout(() => {
          selectedText.value = text;
          isOpen.value = false;
          host.removeAttribute('open');
          host.removeAttribute('selecting');

          host.dispatchEvent(new CustomEvent('change', {
            detail: { value, text },
            bubbles: true
          }));
        }, 400);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    host.addEventListener('click', handleOptionClick);

    return () => {
      document.removeEventListener('click', handleOutsideClick);
      host.removeEventListener('click', handleOptionClick);
    };
  }, []);

  return html`
    <${ErrorBoundary} name="VoidSelect">
      <div class="void-container">
        <button class="void-trigger" type="button" onClick=${handleTriggerClick}>
          <span class="void-selected">${selectedText}</span>
          <span class="void-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </span>
        </button>
        <div class="void-dropdown">
          <div class="void-options">
            <slot></slot>
          </div>
        </div>
      </div>
    <//>
  `;
}

createShadowComponent(VoidSelect, { 
  tag: 'void-select', 
  styleUrl: new URL('./styles.css', import.meta.url).href
});
