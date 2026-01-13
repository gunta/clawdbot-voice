import { html } from 'htm/preact';
import { useSignal } from '@preact/signals';
import { useRef, useEffect } from 'preact/hooks';
import { createShadowComponent } from '../../shared/shadow-component.js';
import { ErrorBoundary } from '../../shared/error-boundary.js';

function SpectrumSlider({ host }) {
  const value = useSignal(parseInt(host.getAttribute('value') || '50'));
  const min = parseInt(host.getAttribute('min') || '0');
  const max = parseInt(host.getAttribute('max') || '100');
  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const lastTime = useRef(0);

  const updateVisuals = (val) => {
    const percentage = ((val - min) / (max - min)) * 100;
    host.style.setProperty('--value', `${percentage}%`);
  };

  useEffect(() => {
    updateVisuals(value.value);
    
    const container = containerRef.current;
    if (!container) return;

    const handleMove = (clientX) => {
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      value.value = Math.round(x * (max - min) + min);
      
      const now = Date.now();
      const velocity = Math.abs(clientX - lastX.current) / (now - lastTime.current + 1);
      
      if (velocity > 2) {
        host.setAttribute('velocity', 'fast');
      } else if (velocity > 0.5) {
        host.setAttribute('velocity', 'medium');
      } else {
        host.setAttribute('velocity', 'slow');
      }

      lastX.current = clientX;
      lastTime.current = now;
      
      updateVisuals(value.value);
    };

    const handleMouseDown = (e) => {
      isDragging.current = true;
      host.setAttribute('dragging', '');
      handleMove(e.clientX);
    };

    const handleMouseMove = (e) => {
      if (isDragging.current) {
        handleMove(e.clientX);
      }
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        host.removeAttribute('dragging');
        setTimeout(() => host.removeAttribute('velocity'), 300);
        
        host.dispatchEvent(new CustomEvent('change', {
          detail: { value: value.value },
          bubbles: true
        }));
      }
    };

    const handleTouchStart = (e) => {
      isDragging.current = true;
      host.setAttribute('dragging', '');
      handleMove(e.touches[0].clientX);
    };

    const handleTouchMove = (e) => {
      if (isDragging.current) {
        e.preventDefault();
        handleMove(e.touches[0].clientX);
      }
    };

    const handleTouchEnd = () => {
      isDragging.current = false;
      host.removeAttribute('dragging');
      setTimeout(() => host.removeAttribute('velocity'), 300);
    };

    container.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return html`
    <${ErrorBoundary} name="SpectrumSlider">
      <div class="slider-container" ref=${containerRef}>
        <div class="slider-track">
          <div class="track-energy"></div>
        </div>
        <div class="slider-thumb">
          <div class="thumb-ring"></div>
          <div class="thumb-center"></div>
        </div>
        <div class="slider-value">${value}</div>
      </div>
    <//>
  `;
}

createShadowComponent(SpectrumSlider, { 
  tag: 'spectrum-slider', 
  styleUrl: new URL('./styles.css', import.meta.url).href
});
