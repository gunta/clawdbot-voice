import { html } from 'htm/preact';
import { useRef, useEffect } from 'preact/hooks';
import { createShadowComponent } from '../../shared/shadow-component.js';
import { ErrorBoundary } from '../../shared/error-boundary.js';

function FluidGlass({ host }) {
  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const tiltIntensity = 15;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const tiltX = (y - 0.5) * tiltIntensity;
      const tiltY = (x - 0.5) * -tiltIntensity;

      host.style.setProperty('--tilt-x', `${tiltX}deg`);
      host.style.setProperty('--tilt-y', `${tiltY}deg`);
      host.style.setProperty('--mouse-x', `${x * 100}%`);
      host.style.setProperty('--mouse-y', `${y * 100}%`);
      host.setAttribute('tilt', '');
    };

    const handleMouseLeave = () => {
      host.removeAttribute('tilt');
      host.style.removeProperty('--tilt-x');
      host.style.removeProperty('--tilt-y');
    };

    const handleMouseDown = () => {
      isDragging.current = true;
      host.setAttribute('dragging', '');
    };

    const handleMouseUp = (e) => {
      if (isDragging.current) {
        isDragging.current = false;
        host.removeAttribute('dragging');
        
        const rect = container.getBoundingClientRect();
        host.style.setProperty('--ripple-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
        host.style.setProperty('--ripple-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
        host.setAttribute('ripple', '');
        setTimeout(() => host.removeAttribute('ripple'), 800);
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return html`
    <${ErrorBoundary} name="FluidGlass">
      <div class="glass-container" ref=${containerRef}>
        <div class="glass-surface">
          <div class="glass-content">
            <slot></slot>
          </div>
        </div>
      </div>
    <//>
  `;
}

createShadowComponent(FluidGlass, { 
  tag: 'fluid-glass', 
  styleUrl: new URL('./styles.css', import.meta.url).href
});
