import { html } from 'htm/preact';
import { useRef, useEffect } from 'preact/hooks';
import { createShadowComponent } from '../../shared/shadow-component.js';
import { ErrorBoundary } from '../../shared/error-boundary.js';

function GravityCard({ host }) {
  const containerRef = useRef(null);
  const maxTilt = 20;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const tiltX = (y - 0.5) * maxTilt;
      const tiltY = (x - 0.5) * -maxTilt;

      host.style.setProperty('--tilt-x', `${tiltX}deg`);
      host.style.setProperty('--tilt-y', `${tiltY}deg`);

      const distFromCenter = Math.hypot(x - 0.5, y - 0.5);
      if (distFromCenter < 0.2) {
        host.setAttribute('strong-pull', '');
      } else {
        host.removeAttribute('strong-pull');
      }
    };

    const handleMouseLeave = () => {
      host.style.removeProperty('--tilt-x');
      host.style.removeProperty('--tilt-y');
      host.removeAttribute('strong-pull');
    };

    const handleClick = () => {
      host.setAttribute('ripple', '');
      setTimeout(() => host.removeAttribute('ripple'), 800);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('click', handleClick);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('click', handleClick);
    };
  }, []);

  return html`
    <${ErrorBoundary} name="GravityCard">
      <div class="gravity-container" ref=${containerRef} tabindex="0">
        <div class="gravity-surface">
          <div class="surface-content">
            <slot></slot>
          </div>
        </div>
      </div>
    <//>
  `;
}

createShadowComponent(GravityCard, { 
  tag: 'gravity-card', 
  styleUrl: new URL('./styles.css', import.meta.url).href
});
