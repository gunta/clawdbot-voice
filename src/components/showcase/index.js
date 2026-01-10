/**
 * CLAWD OS1 - Component Laboratory
 * Revolutionary Web Components for a Futuristic OS
 * Migrated to Preact + HTM + Signals
 * Styles loaded from external CSS files for proper syntax highlighting
 */
import { html } from 'htm/preact';
import { useSignal } from '@preact/signals';
import { useRef, useEffect } from 'preact/hooks';
import { createShadowComponent } from '../../lib/shadow-component.js';
import { ErrorBoundary } from '../../lib/error-boundary.js';

// Base path for showcase styles
const STYLES_PATH = './src/components/showcase';

// ═══════════════════════════════════════════════════════════════════════════
// BREATH BUTTON - Living, breathing button
// ═══════════════════════════════════════════════════════════════════════════

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
  styleUrl: `${STYLES_PATH}/breath-button.css` 
});

// ═══════════════════════════════════════════════════════════════════════════
// PULSE BADGE - Heartbeat status indicator
// ═══════════════════════════════════════════════════════════════════════════

function PulseBadge({ host }) {
  const status = useSignal(host.getAttribute('status') || '');

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'status') {
          const newStatus = host.getAttribute('status') || '';
          status.value = newStatus;
          host.dispatchEvent(new CustomEvent('status-change', {
            detail: { status: newStatus },
            bubbles: true
          }));
        }
      });
    });

    observer.observe(host, { attributes: true });
    return () => observer.disconnect();
  }, []);

  return html`
    <${ErrorBoundary} name="PulseBadge">
      <div class="badge">
        <div class="badge-heartbeat"></div>
        <div class="badge-heartbeat delay"></div>
        <span class="badge-core"><slot></slot></span>
      </div>
    <//>
  `;
}

createShadowComponent(PulseBadge, { 
  tag: 'pulse-badge', 
  styleUrl: `${STYLES_PATH}/pulse-badge.css` 
});

// ═══════════════════════════════════════════════════════════════════════════
// FLUID GLASS - Morphing glass card with tilt effect
// ═══════════════════════════════════════════════════════════════════════════

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
  styleUrl: `${STYLES_PATH}/fluid-glass.css` 
});

// ═══════════════════════════════════════════════════════════════════════════
// PHASE TOGGLE - Matter state transitioning toggle
// ═══════════════════════════════════════════════════════════════════════════

function PhaseToggle({ host }) {
  const checked = useSignal(false);

  const handleClick = () => {
    checked.value = !checked.value;
    
    host.setAttribute('transitioning', '');
    setTimeout(() => host.removeAttribute('transitioning'), 500);

    host.dispatchEvent(new CustomEvent('toggle', {
      detail: { checked: checked.value },
      bubbles: true
    }));
  };

  return html`
    <${ErrorBoundary} name="PhaseToggle">
      <button 
        class="phase-toggle" 
        type="button"
        role="switch"
        aria-checked=${checked.value}
        onClick=${handleClick}
      >
        <div class="phase-track"></div>
        <div class="phase-thumb">
          <div class="thumb-core"></div>
        </div>
        <div class="phase-labels">
          <span class="label-off">OFF</span>
          <span class="label-on">ON</span>
        </div>
      </button>
    <//>
  `;
}

createShadowComponent(PhaseToggle, { 
  tag: 'phase-toggle', 
  styleUrl: `${STYLES_PATH}/phase-toggle.css` 
});

// ═══════════════════════════════════════════════════════════════════════════
// SPECTRUM SLIDER - Energy trail slider
// ═══════════════════════════════════════════════════════════════════════════

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
  styleUrl: `${STYLES_PATH}/spectrum-slider.css` 
});

// ═══════════════════════════════════════════════════════════════════════════
// NERVE INPUT - Neural activity input field
// ═══════════════════════════════════════════════════════════════════════════

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
  styleUrl: `${STYLES_PATH}/nerve-input.css` 
});

// ═══════════════════════════════════════════════════════════════════════════
// VOID SELECT - Singularity dropdown
// ═══════════════════════════════════════════════════════════════════════════

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
  styleUrl: `${STYLES_PATH}/void-select.css` 
});

// ═══════════════════════════════════════════════════════════════════════════
// RIPPLE LIST - Neural propagation list
// ═══════════════════════════════════════════════════════════════════════════

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
  styleUrl: `${STYLES_PATH}/ripple-list.css` 
});

// ═══════════════════════════════════════════════════════════════════════════
// ORBITAL MENU - Radial navigation
// ═══════════════════════════════════════════════════════════════════════════

function OrbitalMenu({ host }) {
  const isExpanded = useSignal(false);

  const handleCoreClick = () => {
    isExpanded.value = !isExpanded.value;
    if (isExpanded.value) {
      host.setAttribute('expanded', '');
    } else {
      host.removeAttribute('expanded');
    }
  };

  useEffect(() => {
    const handleItemClick = (e) => {
      const item = e.target.closest('.orbital-item');
      if (item) {
        host.dispatchEvent(new CustomEvent('orbital-select', {
          detail: { 
            angle: item.dataset.angle,
            orbit: item.dataset.orbit 
          },
          bubbles: true
        }));
      }
    };

    const handleOutsideClick = (e) => {
      if (!host.contains(e.target) && isExpanded.value) {
        isExpanded.value = false;
        host.removeAttribute('expanded');
      }
    };

    host.addEventListener('click', handleItemClick);
    document.addEventListener('click', handleOutsideClick);

    return () => {
      host.removeEventListener('click', handleItemClick);
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  return html`
    <${ErrorBoundary} name="OrbitalMenu">
      <div class="orbital-container">
        <svg class="orbit-paths" viewBox="0 0 260 260">
          <circle class="orbit-path" cx="130" cy="130" r="80"/>
        </svg>
        <button class="orbital-core" type="button" onClick=${handleCoreClick}>
          <span class="core-icon">+</span>
          <div class="core-ring"></div>
          <div class="core-ring ring-2"></div>
        </button>
        <div class="orbital-items">
          <slot></slot>
        </div>
      </div>
    <//>
  `;
}

createShadowComponent(OrbitalMenu, { 
  tag: 'orbital-menu', 
  styleUrl: `${STYLES_PATH}/orbital-menu.css` 
});

// ═══════════════════════════════════════════════════════════════════════════
// GRAVITY CARD - Gravitational tilt card
// ═══════════════════════════════════════════════════════════════════════════

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
  styleUrl: `${STYLES_PATH}/gravity-card.css` 
});

// ═══════════════════════════════════════════════════════════════════════════
// HOLOGRAM AVATAR - Holographic projection avatar
// ═══════════════════════════════════════════════════════════════════════════

function HologramAvatar({ host }) {
  return html`
    <${ErrorBoundary} name="HologramAvatar">
      <div class="holo-container">
        <div class="holo-projection">
          <div class="holo-image">
            <slot>
              <svg class="default-avatar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
              </svg>
            </slot>
          </div>
          <div class="holo-scanlines"></div>
        </div>
        <div class="holo-base">
          <div class="base-ring"></div>
        </div>
        <div class="status-indicator"></div>
      </div>
    <//>
  `;
}

createShadowComponent(HologramAvatar, { 
  tag: 'hologram-avatar', 
  styleUrl: `${STYLES_PATH}/hologram-avatar.css` 
});

// ═══════════════════════════════════════════════════════════════════════════
// AURORA PROGRESS - Aurora borealis progress bar
// ═══════════════════════════════════════════════════════════════════════════

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
  styleUrl: `${STYLES_PATH}/aurora-progress.css` 
});

// ═══════════════════════════════════════════════════════════════════════════
// PRISM TABS - Light refracting tabs
// ═══════════════════════════════════════════════════════════════════════════

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
  styleUrl: `${STYLES_PATH}/prism-tabs.css` 
});

// ═══════════════════════════════════════════════════════════════════════════
// ECHO TOOLTIP - Reverberating tooltip
// ═══════════════════════════════════════════════════════════════════════════

function EchoTooltip({ host }) {
  const message = host.getAttribute('message') || '';

  return html`
    <${ErrorBoundary} name="EchoTooltip">
      <div class="echo-trigger" tabindex="0">
        <slot></slot>
        <div class="echo-bubble">
          <span class="echo-text">${message}</span>
        </div>
      </div>
    <//>
  `;
}

createShadowComponent(EchoTooltip, { 
  tag: 'echo-tooltip', 
  styleUrl: `${STYLES_PATH}/echo-tooltip.css` 
});

// ═══════════════════════════════════════════════════════════════════════════
// MEMBRANE MODAL - Organic stretching modal
// ═══════════════════════════════════════════════════════════════════════════

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
  styleUrl: `${STYLES_PATH}/membrane-modal.css` 
});

// ═══════════════════════════════════════════════════════════════════════════
// PAGE INTERACTIONS
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  const navNodes = document.querySelectorAll('.nav-node');
  const sections = document.querySelectorAll('.lab-section');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const sectionId = entry.target.id;
        navNodes.forEach(node => {
          if (node.dataset.section === sectionId) {
            node.classList.add('active');
          } else {
            node.classList.remove('active');
          }
        });
      }
    });
  }, { threshold: 0.5 });

  sections.forEach(section => observer.observe(section));

  navNodes.forEach(node => {
    node.addEventListener('click', () => {
      const targetId = node.dataset.section;
      const targetSection = document.getElementById(targetId);
      targetSection?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  const modalTrigger = document.getElementById('membraneModalTrigger');
  const modal = document.getElementById('membraneModal');

  modalTrigger?.addEventListener('breath-click', () => {
    modal?.open();
  });

  modal?.querySelector('breath-button')?.addEventListener('breath-click', () => {
    modal?.close();
  });

  const auroraProgress = document.getElementById('auroraProgress1');
  let progressValue = 67;
  
  auroraProgress?.addEventListener('click', () => {
    progressValue = (progressValue + 10) % 110;
    if (progressValue > 100) progressValue = 0;
    auroraProgress.setValue(progressValue);
  });

  console.log('[Laboratory] Component showcase initialized with HTM');
});
