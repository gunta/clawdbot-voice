/**
 * Voice Card Component
 * Displays a voice character with SVG and audio playback
 * Includes audio-reactive line animations
 */
import { html } from 'htm/preact';
import { signal } from '@preact/signals';
import { useRef, useEffect } from 'preact/hooks';
import { createShadowComponent } from '../shared/shadow-component.js';
import { ErrorBoundary } from '../shared/error-boundary.js';
import { haptic } from '../../services/haptic.js';
import { audioAnalyzer } from '../../services/audio-analyzer.js';

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
  styleUrl: new URL('./styles.css', import.meta.url).href,
});
