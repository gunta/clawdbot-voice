/**
 * Voice Card Component
 * Displays a voice character with SVG and audio playback
 * Includes audio-reactive line animations
 */
import { html } from 'htm/preact';
import { signal, effect } from '@preact/signals';
import { useRef, useEffect } from 'preact/hooks';
import { createShadowComponent } from '../lib/shadow-component.js';
import { ErrorBoundary } from '../lib/error-boundary.js';
import { haptic } from '../services/haptic.js';
import { audioAnalyzer } from '../services/audio-analyzer.js';

const styles = `
/* Voice Card Component Styles */
/* HDR-enabled with OKLCH colors */

:host {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  cursor: pointer;
  outline: none;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
  animation: fade-in 1s ease forwards;
  opacity: 0;
  contain: content;
  /* Enable HDR */
  dynamic-range-limit: no-limit;
}

:host([delay="1"]) { animation-delay: 0.2s; }
:host([delay="2"]) { animation-delay: 0.4s; }

:host(:hover) {
  transform: scale(1.03);
  transition: transform 0.15s ease;
}

:host(:active) {
  transform: scale(0.96);
  transition: transform 0.1s ease;
}

:host([selected]) {
  transform: scale(1.02);
}

/* SVG Container */
.svg-container {
  width: var(--card-svg-width, 140px);
  height: var(--card-svg-height, 200px);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.25rem;
  position: relative;
}

::slotted(svg),
.figure-svg {
  width: 100%;
  height: 100%;
  color: var(--color-white, oklch(1 0 0));
  transition: transform 0.4s ease, filter 0.4s ease;
}

:host([selected]) ::slotted(svg),
:host([selected]) .figure-svg {
  filter: drop-shadow(0 0 20px oklch(1 0 0 / 0.2));
}

:host(:hover) ::slotted(svg),
:host(:hover) .figure-svg {
  animation: svg-float 3s ease-in-out infinite;
}

:host([playing]) ::slotted(svg),
:host([playing]) .figure-svg {
  animation: svg-dance 0.6s ease-in-out infinite;
}

/* Line separator */
.line {
  width: var(--card-line-width, 120px);
  height: 2px;
  background: var(--color-white, oklch(1 0 0));
  margin-bottom: 1.25rem;
  opacity: 0.5;
  transition: all 0.4s ease;
}

:host(:hover) .line,
:host([selected]) .line {
  width: calc(var(--card-line-width, 120px) + 20px);
  opacity: 0.8;
}

:host([playing]) .line {
  opacity: 1;
  animation: line-pulse 0.8s ease-in-out infinite;
}

/* Text content */
.text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.title {
  font-family: var(--font-display, 'Bodoni Moda', 'Georgia', serif);
  font-size: var(--font-size-2xl, 1.5rem);
  font-weight: 400;
  font-style: italic;
  color: var(--color-white, oklch(1 0 0));
  letter-spacing: 0.02em;
  transition: all 0.3s ease;
}

:host([selected]) .title,
:host([playing]) .title {
  text-shadow: 0 0 20px oklch(1 0 0 / 0.3);
}

.subtitle {
  font-family: var(--font-body, 'Cormorant Garamond', serif);
  font-size: var(--font-size-sm, 0.8rem);
  font-weight: 300;
  color: var(--color-white-soft, oklch(1 0 0 / 0.85));
  letter-spacing: 0.05em;
}

/* Ripple effect */
.ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: oklch(1 0 0 / 0.15);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0;
}

:host(:active) .ripple {
  width: 250px;
  height: 250px;
  opacity: 1;
  transition: width 0.1s ease, height 0.1s ease, opacity 0s;
}

/* Animations */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes svg-float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-4px) rotate(0.5deg); }
  75% { transform: translateY(-2px) rotate(-0.5deg); }
}

@keyframes svg-dance {
  0%, 100% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.02) rotate(1deg); }
  75% { transform: scale(1.02) rotate(-1deg); }
}

@keyframes line-pulse {
  0%, 100% { opacity: 0.8; box-shadow: 0 0 0 oklch(1 0 0 / 0); }
  50% { opacity: 1; box-shadow: 0 0 15px oklch(1 0 0 / 0.5); }
}

/* HDR Enhancement - Peak brightness on HDR displays */
@media (dynamic-range: high) {
  ::slotted(svg),
  .figure-svg {
    color: var(--hdr-white-peak, oklch(1.5 0 0));
  }

  :host([selected]) ::slotted(svg),
  :host([selected]) .figure-svg {
    filter: drop-shadow(0 0 30px oklch(1.3 0 0 / 0.4));
  }

  .line {
    background: var(--hdr-white-vivid, oklch(1.3 0 0));
  }

  .title {
    color: var(--hdr-white-peak, oklch(1.5 0 0));
  }

  :host([selected]) .title,
  :host([playing]) .title {
    text-shadow: 0 0 30px oklch(1.3 0 0 / 0.5);
  }

  @keyframes line-pulse {
    0%, 100% { opacity: 0.8; box-shadow: 0 0 0 oklch(1.3 0 0 / 0); }
    50% { opacity: 1; box-shadow: 0 0 25px oklch(1.5 0 0 / 0.6); }
  }
}

/* Responsive */
@media (max-width: 700px) {
  .svg-container { margin-bottom: 1rem; }
  .line { margin-bottom: 1rem; }
  .title { font-size: 1.2rem; }
  .subtitle { font-size: 0.7rem; }
}

@media (max-height: 650px) {
  .svg-container { margin-bottom: 0.75rem; }
  .line { margin-bottom: 0.75rem; }
}

@media (max-width: 400px) {
  .title { font-size: 1.1rem; }
}
`;

function VoiceCard({ host, voice, audioSrc, delay }) {
  const isPlaying = signal(false);
  const isSelected = signal(false);
  const svgContainerRef = useRef(null);
  const linesRef = useRef([]);

  // Get attributes from host if not passed as props
  const voiceName = voice || host.getAttribute('voice') || 'voice';
  const audio = audioSrc || host.getAttribute('audio-src');

  // Cache SVG lines for audio-reactive animations
  const cacheLines = () => {
    if (!svgContainerRef.current) return;

    // Get slotted SVG element
    const slot = svgContainerRef.current.querySelector('slot');
    if (!slot) return;

    const assignedNodes = slot.assignedElements ? slot.assignedElements() : [];
    const svg = assignedNodes.find(node => node.tagName === 'svg');

    if (svg) {
      linesRef.current = Array.from(svg.querySelectorAll('path, ellipse, circle'));
    }
  };

  // Update line styles based on audio levels
  const updateLines = (detail) => {
    if (!isPlaying.value || !linesRef.current.length) return;

    const { levels, average } = detail;

    linesRef.current.forEach((line, index) => {
      // Map line index to a frequency band
      const bandIndex = index % levels.length;
      const level = levels[bandIndex];

      // Calculate stroke width based on level (1.5 to 4)
      const strokeWidth = 1.5 + level * 2.5;

      // Calculate dash offset for flowing effect
      const dashOffset = (performance.now() / 50) % 24;

      // Apply styles directly for performance
      line.style.strokeWidth = `${strokeWidth}px`;
      line.style.strokeDasharray = level > 0.2 ? '8 4' : 'none';
      line.style.strokeDashoffset = level > 0.2 ? `${dashOffset}` : '0';

      // Add glow effect based on level
      const glowIntensity = Math.floor(level * 10);
      line.style.filter = level > 0.3
        ? `drop-shadow(0 0 ${glowIntensity}px rgba(255,255,255,${level * 0.5}))`
        : 'none';
    });
  };

  // Reset line styles
  const resetLines = () => {
    linesRef.current.forEach((line) => {
      line.style.strokeWidth = '';
      line.style.strokeDasharray = '';
      line.style.strokeDashoffset = '';
      line.style.filter = '';
    });
  };

  const handleClick = () => {
    console.log('[VoiceCard] Click handled, voice:', voiceName);
    host.dispatchEvent(new CustomEvent('voice-select', {
      bubbles: true,
      composed: true,
      detail: {
        voice: voiceName,
        audioSrc: audio
      }
    }));
  };

  const handleTouchStart = () => {
    haptic('light');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  // Setup audio analyzer listener
  useEffect(() => {
    // Set role and tabindex on host
    host.setAttribute('role', 'button');
    host.setAttribute('tabindex', '0');

    // Cache lines after mount
    setTimeout(() => cacheLines(), 100);

    // Listen for audio level changes
    const handleLevels = (e) => updateLines(e.detail);
    audioAnalyzer.addEventListener('levels', handleLevels);

    return () => {
      audioAnalyzer.removeEventListener('levels', handleLevels);
    };
  }, []);

  // Watch for playing state changes
  useEffect(() => {
    if (isPlaying.value) {
      host.setAttribute('playing', '');
      cacheLines(); // Re-cache in case SVG wasn't ready before
    } else {
      host.removeAttribute('playing');
      resetLines();
    }
  }, [isPlaying.value]);

  // Watch for selected state changes
  useEffect(() => {
    if (isSelected.value) {
      host.setAttribute('selected', '');
    } else {
      host.removeAttribute('selected');
    }
  }, [isSelected.value]);

  // Expose methods and properties for external control
  host.setPlaying = (playing) => {
    isPlaying.value = playing;
  };

  host.setSelected = (selected) => {
    isSelected.value = selected;
  };

  if (!Object.getOwnPropertyDescriptor(host, 'playing')) {
    Object.defineProperty(host, 'playing', {
      configurable: true,
      get: () => isPlaying.value,
      set: (value) => { isPlaying.value = Boolean(value); }
    });
  }

  if (!Object.getOwnPropertyDescriptor(host, 'selected')) {
    Object.defineProperty(host, 'selected', {
      configurable: true,
      get: () => isSelected.value,
      set: (value) => { isSelected.value = Boolean(value); }
    });
  }

  if (!Object.getOwnPropertyDescriptor(host, 'voice')) {
    Object.defineProperty(host, 'voice', {
      configurable: true,
      get: () => voiceName
    });
  }

  if (!Object.getOwnPropertyDescriptor(host, 'audioSrc')) {
    Object.defineProperty(host, 'audioSrc', {
      configurable: true,
      get: () => audio
    });
  }

  return html`
    <${ErrorBoundary} name="VoiceCard">
      <div
        class="voice-card"
        onClick=${handleClick}
        onTouchStart=${handleTouchStart}
        onKeyDown=${handleKeyDown}
      >
        <div class="svg-container" ref=${svgContainerRef}>
          <slot name="svg"><slot></slot></slot>
          <div class="ripple"></div>
        </div>
        <div class="line"></div>
        <div class="text">
          <span class="title"><slot name="title">Voice</slot></span>
          <span class="subtitle"><slot name="subtitle">description</slot></span>
        </div>
      </div>
    <//>
  `;
}

export default createShadowComponent(VoiceCard, {
  tag: 'voice-card',
  styles,
});
