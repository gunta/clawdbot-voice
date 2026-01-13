import { html } from 'htm/preact';
import { useRef, useEffect } from 'preact/hooks';
import { createShadowComponent } from '../../shared/shadow-component.js';
import { ErrorBoundary } from '../../shared/error-boundary.js';

function PrismTabs({ host }) {
  const indicatorRef = useRef(null);

  useEffect(() => {
    const updateIndicator = (tab) => {
      const tabRect = tab.getBoundingClientRect();
      const containerRect = host.getBoundingClientRect();
      host.style.setProperty('--indicator-left', `${tabRect.left - containerRect.left}px`);
      host.style.setProperty('--indicator-width', `${tabRect.width}px`);
    };

    const handleTabClick = (e) => {
      const tab = e.target.closest('.prism-tab');
      if (!tab) return;

      host.setAttribute('refracting', '');
      
      const tabs = host.querySelectorAll('.prism-tab');
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      updateIndicator(tab);

      setTimeout(() => host.removeAttribute('refracting'), 800);

      host.dispatchEvent(new CustomEvent('tab-change', {
        detail: { tab: tab.dataset.tab },
        bubbles: true
      }));
    };

    // Initialize indicator
    const activeTab = host.querySelector('.prism-tab.active');
    if (activeTab) {
      updateIndicator(activeTab);
    }

    host.addEventListener('click', handleTabClick);
    return () => host.removeEventListener('click', handleTabClick);
  }, []);

  return html`
    <${ErrorBoundary} name="PrismTabs">
      <div class="prism-container">
        <div class="prism-track">
          <slot></slot>
        </div>
        <div class="prism-indicator" ref=${indicatorRef}></div>
      </div>
    <//>
  `;
}

createShadowComponent(PrismTabs, { 
  tag: 'prism-tabs', 
  styleUrl: new URL('./styles.css', import.meta.url).href
});
