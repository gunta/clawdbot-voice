import { html } from 'htm/preact';
import { useRef, useEffect } from 'preact/hooks';
import { createShadowComponent } from '../../shared/shadow-component.js';
import { ErrorBoundary } from '../../shared/error-boundary.js';

function NerveInput({ host }) {
  const inputRef = useRef(null);
  const typingTimeout = useRef(null);
  const placeholder = host.getAttribute('placeholder') || '';
  const label = host.getAttribute('label') || 'input';

  const handleInput = (e) => {
    host.setAttribute('typing', '');
    clearTimeout(typingTimeout.current);
    
    typingTimeout.current = setTimeout(() => {
      host.removeAttribute('typing');
    }, 150);

    host.dispatchEvent(new CustomEvent('nerve-input', {
      detail: { value: e.target.value },
      bubbles: true
    }));
  };

  const handleFocus = () => host.setAttribute('focused', '');
  const handleBlur = () => host.removeAttribute('focused');

  useEffect(() => {
    host.setProcessing = (processing) => {
      if (processing) host.setAttribute('processing', '');
      else host.removeAttribute('processing');
    };
    host.setError = (error) => {
      if (error) host.setAttribute('error', '');
      else host.removeAttribute('error');
    };
  }, []);

  return html`
    <${ErrorBoundary} name="NerveInput">
      <div class="nerve-container">
        <div class="nerve-field">
          <input 
            class="nerve-input"
            ref=${inputRef}
            type="text"
            placeholder=${placeholder}
            onInput=${handleInput}
            onFocus=${handleFocus}
            onBlur=${handleBlur}
          />
          <div class="nerve-synapses">
            <div class="synapse s1"></div>
            <div class="synapse s2"></div>
            <div class="synapse s3"></div>
            <div class="synapse s4"></div>
            <div class="synapse s5"></div>
          </div>
          <span class="nerve-label">${label}</span>
          <div class="nerve-underline">
            <div class="underline-static"></div>
            <div class="underline-active"></div>
          </div>
        </div>
      </div>
    <//>
  `;
}

createShadowComponent(NerveInput, { 
  tag: 'nerve-input', 
  styleUrl: new URL('./styles.css', import.meta.url).href
});
