import { html } from 'htm/preact';
import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { createShadowComponent } from '../../shared/shadow-component.js';
import { ErrorBoundary } from '../../shared/error-boundary.js';

function AuroraProgress({ host }) {
  const value = useSignal(parseInt(host.getAttribute('value') || '0'));

  const updateProgress = (val) => {
    host.style.setProperty('--progress', `${val}%`);
    
    if (val >= 100) {
      host.setAttribute('complete', '');
      host.setAttribute('intensity', 'high');
    } else if (val >= 67) {
      host.removeAttribute('complete');
      host.setAttribute('intensity', 'high');
    } else if (val >= 34) {
      host.removeAttribute('complete');
      host.setAttribute('intensity', 'medium');
    } else {
      host.removeAttribute('complete');
      host.setAttribute('intensity', 'low');
    }
  };

  useEffect(() => {
    updateProgress(value.value);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'value') {
          value.value = parseInt(host.getAttribute('value') || '0');
          updateProgress(value.value);
        }
      });
    });

    observer.observe(host, { attributes: true });
    
    // Expose setValue method
    host.setValue = (val) => {
      host.setAttribute('value', val.toString());
      value.value = val;
      updateProgress(val);
    };

    return () => observer.disconnect();
  }, []);

  return html`
    <${ErrorBoundary} name="AuroraProgress">
      <div class="aurora-container">
        <div class="aurora-track">
          <div class="aurora-fill"></div>
        </div>
        <div class="aurora-label">
          <span class="label-value">${value}</span>
          <span class="label-unit">%</span>
        </div>
      </div>
    <//>
  `;
}

createShadowComponent(AuroraProgress, { 
  tag: 'aurora-progress', 
  styleUrl: new URL('./styles.css', import.meta.url).href
});
