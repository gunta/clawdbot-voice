/**
 * CLAWD OS1 - Component Laboratory
 * Revolutionary Web Components for a Futuristic OS
 */

// ═══════════════════════════════════════════════════════════════════════════
// BREATH BUTTON - Living, breathing button
// ═══════════════════════════════════════════════════════════════════════════

class BreathButton extends HTMLElement {
  constructor() {
    super();
    this.proximityThreshold = 150;
  }

  connectedCallback() {
    const btn = this.shadowRoot?.querySelector('.breath-btn');
    if (!btn) return;

    // Track mouse proximity for breathing effect
    document.addEventListener('mousemove', (e) => {
      const rect = this.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.hypot(e.clientX - centerX, e.clientY - centerY);

      if (distance < 50) {
        this.setAttribute('proximity', 'close');
      } else if (distance < this.proximityThreshold) {
        this.setAttribute('proximity', 'near');
      } else {
        this.removeAttribute('proximity');
      }
    });

    btn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('breath-click', { bubbles: true }));
    });
  }
}

customElements.define('breath-button', BreathButton);

// ═══════════════════════════════════════════════════════════════════════════
// PULSE BADGE - Heartbeat status indicator
// ═══════════════════════════════════════════════════════════════════════════

class PulseBadge extends HTMLElement {
  static get observedAttributes() {
    return ['status'];
  }

  connectedCallback() {
    // Status is set via attribute, CSS handles the visuals
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'status') {
      this.dispatchEvent(new CustomEvent('status-change', {
        detail: { status: newValue },
        bubbles: true
      }));
    }
  }
}

customElements.define('pulse-badge', PulseBadge);

// ═══════════════════════════════════════════════════════════════════════════
// FLUID GLASS - Morphing glass card with tilt effect
// ═══════════════════════════════════════════════════════════════════════════

class FluidGlass extends HTMLElement {
  constructor() {
    super();
    this.isDragging = false;
    this.tiltIntensity = 15;
  }

  connectedCallback() {
    const container = this.shadowRoot?.querySelector('.glass-container');
    if (!container) return;

    // Tilt on mouse move
    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const tiltX = (y - 0.5) * this.tiltIntensity;
      const tiltY = (x - 0.5) * -this.tiltIntensity;

      this.style.setProperty('--tilt-x', `${tiltX}deg`);
      this.style.setProperty('--tilt-y', `${tiltY}deg`);
      this.style.setProperty('--mouse-x', `${x * 100}%`);
      this.style.setProperty('--mouse-y', `${y * 100}%`);
      this.setAttribute('tilt', '');
    });

    container.addEventListener('mouseleave', () => {
      this.removeAttribute('tilt');
      this.style.removeProperty('--tilt-x');
      this.style.removeProperty('--tilt-y');
    });

    // Drag interaction
    container.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.setAttribute('dragging', '');
      this.startX = e.clientX;
      this.startY = e.clientY;
    });

    document.addEventListener('mouseup', (e) => {
      if (this.isDragging) {
        this.isDragging = false;
        this.removeAttribute('dragging');
        
        // Ripple effect on release
        const rect = container.getBoundingClientRect();
        this.style.setProperty('--ripple-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
        this.style.setProperty('--ripple-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
        this.setAttribute('ripple', '');
        setTimeout(() => this.removeAttribute('ripple'), 800);
      }
    });
  }
}

customElements.define('fluid-glass', FluidGlass);

// ═══════════════════════════════════════════════════════════════════════════
// PHASE TOGGLE - Matter state transitioning toggle
// ═══════════════════════════════════════════════════════════════════════════

class PhaseToggle extends HTMLElement {
  constructor() {
    super();
    this.checked = false;
  }

  connectedCallback() {
    const btn = this.shadowRoot?.querySelector('.phase-toggle');
    if (!btn) return;

    btn.addEventListener('click', () => {
      this.checked = !this.checked;
      btn.setAttribute('aria-checked', this.checked);
      
      // Transitioning state during animation
      this.setAttribute('transitioning', '');
      setTimeout(() => this.removeAttribute('transitioning'), 500);

      this.dispatchEvent(new CustomEvent('toggle', {
        detail: { checked: this.checked },
        bubbles: true
      }));
    });
  }
}

customElements.define('phase-toggle', PhaseToggle);

// ═══════════════════════════════════════════════════════════════════════════
// SPECTRUM SLIDER - Energy trail slider
// ═══════════════════════════════════════════════════════════════════════════

class SpectrumSlider extends HTMLElement {
  constructor() {
    super();
    this.value = 50;
    this.min = 0;
    this.max = 100;
    this.isDragging = false;
    this.lastX = 0;
    this.lastTime = 0;
  }

  connectedCallback() {
    this.value = parseInt(this.getAttribute('value') || '50');
    this.min = parseInt(this.getAttribute('min') || '0');
    this.max = parseInt(this.getAttribute('max') || '100');

    const container = this.shadowRoot?.querySelector('.slider-container');
    const thumb = this.shadowRoot?.querySelector('.slider-thumb');
    if (!container || !thumb) return;

    this.updateVisuals();

    const handleMove = (clientX) => {
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      this.value = Math.round(x * (this.max - this.min) + this.min);
      
      // Calculate velocity for trail effect
      const now = Date.now();
      const velocity = Math.abs(clientX - this.lastX) / (now - this.lastTime + 1);
      
      if (velocity > 2) {
        this.setAttribute('velocity', 'fast');
      } else if (velocity > 0.5) {
        this.setAttribute('velocity', 'medium');
      } else {
        this.setAttribute('velocity', 'slow');
      }

      this.lastX = clientX;
      this.lastTime = now;
      
      this.updateVisuals();
      this.updateSlot();
    };

    container.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.setAttribute('dragging', '');
      handleMove(e.clientX);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        handleMove(e.clientX);
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.removeAttribute('dragging');
        setTimeout(() => this.removeAttribute('velocity'), 300);
        
        this.dispatchEvent(new CustomEvent('change', {
          detail: { value: this.value },
          bubbles: true
        }));
      }
    });

    // Touch support
    container.addEventListener('touchstart', (e) => {
      this.isDragging = true;
      this.setAttribute('dragging', '');
      handleMove(e.touches[0].clientX);
    });

    container.addEventListener('touchmove', (e) => {
      if (this.isDragging) {
        e.preventDefault();
        handleMove(e.touches[0].clientX);
      }
    });

    container.addEventListener('touchend', () => {
      this.isDragging = false;
      this.removeAttribute('dragging');
      setTimeout(() => this.removeAttribute('velocity'), 300);
    });
  }

  updateVisuals() {
    const percentage = ((this.value - this.min) / (this.max - this.min)) * 100;
    this.style.setProperty('--value', `${percentage}%`);
  }

  updateSlot() {
    this.textContent = this.value.toString();
  }
}

customElements.define('spectrum-slider', SpectrumSlider);

// ═══════════════════════════════════════════════════════════════════════════
// NERVE INPUT - Neural activity input field
// ═══════════════════════════════════════════════════════════════════════════

class NerveInput extends HTMLElement {
  constructor() {
    super();
    this.typingTimeout = null;
  }

  connectedCallback() {
    const input = this.shadowRoot?.querySelector('.nerve-input');
    if (!input) return;

    const placeholder = this.getAttribute('placeholder');
    if (placeholder) {
      input.placeholder = placeholder;
    }

    input.addEventListener('input', () => {
      this.setAttribute('typing', '');
      clearTimeout(this.typingTimeout);
      
      this.typingTimeout = setTimeout(() => {
        this.removeAttribute('typing');
      }, 150);

      this.dispatchEvent(new CustomEvent('nerve-input', {
        detail: { value: input.value },
        bubbles: true
      }));
    });

    input.addEventListener('focus', () => {
      this.setAttribute('focused', '');
    });

    input.addEventListener('blur', () => {
      this.removeAttribute('focused');
    });
  }

  setProcessing(processing) {
    if (processing) {
      this.setAttribute('processing', '');
    } else {
      this.removeAttribute('processing');
    }
  }

  setError(error) {
    if (error) {
      this.setAttribute('error', '');
    } else {
      this.removeAttribute('error');
    }
  }
}

customElements.define('nerve-input', NerveInput);

// ═══════════════════════════════════════════════════════════════════════════
// VOID SELECT - Singularity dropdown
// ═══════════════════════════════════════════════════════════════════════════

class VoidSelect extends HTMLElement {
  constructor() {
    super();
    this.isOpen = false;
    this.selectedValue = null;
  }

  connectedCallback() {
    const trigger = this.shadowRoot?.querySelector('.void-trigger');
    const dropdown = this.shadowRoot?.querySelector('.void-dropdown');
    if (!trigger || !dropdown) return;

    trigger.addEventListener('click', () => {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.setAttribute('open', '');
      } else {
        this.removeAttribute('open');
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!this.contains(e.target) && this.isOpen) {
        this.isOpen = false;
        this.removeAttribute('open');
      }
    });

    // Handle option selection
    this.querySelectorAll('[data-value]').forEach(option => {
      option.addEventListener('click', () => {
        this.selectOption(option);
      });
    });
  }

  selectOption(option) {
    const value = option.dataset.value;
    const text = option.textContent;

    // Mark as selecting for animation
    this.setAttribute('selecting', '');
    this.querySelectorAll('[data-value]').forEach(opt => opt.classList.remove('selected'));
    option.classList.add('selected');

    setTimeout(() => {
      this.selectedValue = value;
      const selectedDisplay = this.shadowRoot?.querySelector('.void-selected');
      if (selectedDisplay) {
        selectedDisplay.textContent = text;
      }

      this.isOpen = false;
      this.removeAttribute('open');
      this.removeAttribute('selecting');

      this.dispatchEvent(new CustomEvent('change', {
        detail: { value, text },
        bubbles: true
      }));
    }, 400);
  }
}

customElements.define('void-select', VoidSelect);

// ═══════════════════════════════════════════════════════════════════════════
// RIPPLE LIST - Neural propagation list
// ═══════════════════════════════════════════════════════════════════════════

class RippleList extends HTMLElement {
  connectedCallback() {
    const items = this.querySelectorAll('.ripple-item');
    
    items.forEach((item, index) => {
      item.addEventListener('mouseenter', () => {
        this.setAttribute('ripple-from', index.toString());
      });

      item.addEventListener('mouseleave', () => {
        this.removeAttribute('ripple-from');
      });
    });
  }
}

customElements.define('ripple-list', RippleList);

// ═══════════════════════════════════════════════════════════════════════════
// ORBITAL MENU - Radial navigation
// ═══════════════════════════════════════════════════════════════════════════

class OrbitalMenu extends HTMLElement {
  constructor() {
    super();
    this.isExpanded = false;
  }

  connectedCallback() {
    const core = this.shadowRoot?.querySelector('.orbital-core');
    if (!core) return;

    core.addEventListener('click', () => {
      this.isExpanded = !this.isExpanded;
      if (this.isExpanded) {
        this.setAttribute('expanded', '');
      } else {
        this.removeAttribute('expanded');
      }
    });

    // Handle item clicks
    this.querySelectorAll('.orbital-item').forEach(item => {
      item.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('orbital-select', {
          detail: { 
            angle: item.dataset.angle,
            orbit: item.dataset.orbit 
          },
          bubbles: true
        }));
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!this.contains(e.target) && this.isExpanded) {
        this.isExpanded = false;
        this.removeAttribute('expanded');
      }
    });
  }
}

customElements.define('orbital-menu', OrbitalMenu);

// ═══════════════════════════════════════════════════════════════════════════
// GRAVITY CARD - Gravitational tilt card
// ═══════════════════════════════════════════════════════════════════════════

class GravityCard extends HTMLElement {
  constructor() {
    super();
    this.maxTilt = 20;
  }

  connectedCallback() {
    const container = this.shadowRoot?.querySelector('.gravity-container');
    if (!container) return;

    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const tiltX = (y - 0.5) * this.maxTilt;
      const tiltY = (x - 0.5) * -this.maxTilt;

      this.style.setProperty('--tilt-x', `${tiltX}deg`);
      this.style.setProperty('--tilt-y', `${tiltY}deg`);

      // Strong pull when near center
      const distFromCenter = Math.hypot(x - 0.5, y - 0.5);
      if (distFromCenter < 0.2) {
        this.setAttribute('strong-pull', '');
      } else {
        this.removeAttribute('strong-pull');
      }
    });

    container.addEventListener('mouseleave', () => {
      this.style.removeProperty('--tilt-x');
      this.style.removeProperty('--tilt-y');
      this.removeAttribute('strong-pull');
    });

    container.addEventListener('click', (e) => {
      this.setAttribute('ripple', '');
      setTimeout(() => this.removeAttribute('ripple'), 800);
    });
  }
}

customElements.define('gravity-card', GravityCard);

// ═══════════════════════════════════════════════════════════════════════════
// HOLOGRAM AVATAR - Holographic projection avatar
// ═══════════════════════════════════════════════════════════════════════════

class HologramAvatar extends HTMLElement {
  static get observedAttributes() {
    return ['status'];
  }

  connectedCallback() {
    // Status-based styling is handled by CSS
  }
}

customElements.define('hologram-avatar', HologramAvatar);

// ═══════════════════════════════════════════════════════════════════════════
// AURORA PROGRESS - Aurora borealis progress bar
// ═══════════════════════════════════════════════════════════════════════════

class AuroraProgress extends HTMLElement {
  static get observedAttributes() {
    return ['value'];
  }

  connectedCallback() {
    this.updateProgress();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'value') {
      this.updateProgress();
    }
  }

  updateProgress() {
    const value = parseInt(this.getAttribute('value') || '0');
    this.style.setProperty('--progress', `${value}%`);
    
    // Set intensity based on progress
    if (value >= 100) {
      this.setAttribute('complete', '');
      this.setAttribute('intensity', 'high');
    } else if (value >= 67) {
      this.removeAttribute('complete');
      this.setAttribute('intensity', 'high');
    } else if (value >= 34) {
      this.removeAttribute('complete');
      this.setAttribute('intensity', 'medium');
    } else {
      this.removeAttribute('complete');
      this.setAttribute('intensity', 'low');
    }
  }

  setValue(value) {
    this.setAttribute('value', value.toString());
    this.textContent = value.toString();
  }
}

customElements.define('aurora-progress', AuroraProgress);

// ═══════════════════════════════════════════════════════════════════════════
// PRISM TABS - Light refracting tabs
// ═══════════════════════════════════════════════════════════════════════════

class PrismTabs extends HTMLElement {
  connectedCallback() {
    const tabs = this.querySelectorAll('.prism-tab');
    const indicator = this.shadowRoot?.querySelector('.prism-indicator');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Trigger refraction effect
        this.setAttribute('refracting', '');
        
        // Update active state
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update indicator position
        if (indicator) {
          const tabRect = tab.getBoundingClientRect();
          const containerRect = this.getBoundingClientRect();
          this.style.setProperty('--indicator-left', `${tabRect.left - containerRect.left}px`);
          this.style.setProperty('--indicator-width', `${tabRect.width}px`);
          this.style.setProperty('--light-position', `${tabRect.left - containerRect.left + tabRect.width / 2}px`);
          this.style.setProperty('--refraction-start', `${tabRect.left - containerRect.left}px`);
          this.style.setProperty('--refraction-width', `${tabRect.width}px`);
        }

        setTimeout(() => this.removeAttribute('refracting'), 800);

        this.dispatchEvent(new CustomEvent('tab-change', {
          detail: { tab: tab.dataset.tab },
          bubbles: true
        }));
      });
    });

    // Initialize indicator position
    const activeTab = this.querySelector('.prism-tab.active');
    if (activeTab && indicator) {
      const tabRect = activeTab.getBoundingClientRect();
      const containerRect = this.getBoundingClientRect();
      this.style.setProperty('--indicator-left', `${tabRect.left - containerRect.left}px`);
      this.style.setProperty('--indicator-width', `${tabRect.width}px`);
    }
  }
}

customElements.define('prism-tabs', PrismTabs);

// ═══════════════════════════════════════════════════════════════════════════
// ECHO TOOLTIP - Reverberating tooltip
// ═══════════════════════════════════════════════════════════════════════════

class EchoTooltip extends HTMLElement {
  connectedCallback() {
    const trigger = this.shadowRoot?.querySelector('.echo-trigger');
    const textEl = this.shadowRoot?.querySelector('.echo-text');
    const message = this.getAttribute('message') || '';

    if (textEl) {
      textEl.textContent = message;
    }

    let echoTimeout;
    
    trigger?.addEventListener('mouseenter', () => {
      echoTimeout = setTimeout(() => {
        this.setAttribute('echoing', '');
      }, 2000);
    });

    trigger?.addEventListener('mouseleave', () => {
      clearTimeout(echoTimeout);
      this.removeAttribute('echoing');
    });
  }
}

customElements.define('echo-tooltip', EchoTooltip);

// ═══════════════════════════════════════════════════════════════════════════
// MEMBRANE MODAL - Organic stretching modal
// ═══════════════════════════════════════════════════════════════════════════

class MembraneModal extends HTMLElement {
  constructor() {
    super();
    this.isOpen = false;
  }

  connectedCallback() {
    const backdrop = this.shadowRoot?.querySelector('.membrane-backdrop');
    const closeBtn = this.shadowRoot?.querySelector('.membrane-close');
    const surface = this.shadowRoot?.querySelector('.membrane-surface');

    closeBtn?.addEventListener('click', () => this.close());

    // Note: Removed "click backdrop to close" per user request
    // backdrop?.addEventListener('click', (e) => { ... });

    surface?.addEventListener('click', (e) => {
      const rect = surface.getBoundingClientRect();
      this.style.setProperty('--touch-x', `${e.clientX - rect.left}px`);
      this.style.setProperty('--touch-y', `${e.clientY - rect.top}px`);
      this.setAttribute('touched', '');
      setTimeout(() => this.removeAttribute('touched'), 600);
    });

    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  open() {
    this.isOpen = true;
    this.setAttribute('open', '');
    this.setAttribute('opening', '');
    setTimeout(() => this.removeAttribute('opening'), 600);
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.setAttribute('closing', '');
    setTimeout(() => {
      this.isOpen = false;
      this.removeAttribute('open');
      this.removeAttribute('closing');
      document.body.style.overflow = '';
    }, 400);
  }
}

customElements.define('membrane-modal', MembraneModal);

// ═══════════════════════════════════════════════════════════════════════════
// PAGE INTERACTIONS
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Tendril navigation
  const navNodes = document.querySelectorAll('.nav-node');
  const sections = document.querySelectorAll('.lab-section');

  // Intersection observer for section visibility
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

  // Nav node click to scroll
  navNodes.forEach(node => {
    node.addEventListener('click', () => {
      const targetId = node.dataset.section;
      const targetSection = document.getElementById(targetId);
      targetSection?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Membrane modal trigger
  const modalTrigger = document.getElementById('membraneModalTrigger');
  const modal = document.getElementById('membraneModal');

  modalTrigger?.addEventListener('breath-click', () => {
    modal?.open();
  });

  // Close modal from inside button
  modal?.querySelector('breath-button')?.addEventListener('breath-click', () => {
    modal?.close();
  });

  // Demo: Auto-update aurora progress
  const auroraProgress = document.getElementById('auroraProgress1');
  let progressValue = 67;
  
  // Simulate progress changes on click
  auroraProgress?.addEventListener('click', () => {
    progressValue = (progressValue + 10) % 110;
    if (progressValue > 100) progressValue = 0;
    auroraProgress.setValue(progressValue);
  });

  console.log('[Laboratory] Component showcase initialized');
});
