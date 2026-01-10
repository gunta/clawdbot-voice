/**
 * Handwrite Text - Elegant Handwriting Component
 * Renders text with a beautiful cursive handwriting style using Preact + Signals
 *
 * Usage: <handwrite-text text="Hello World"></handwrite-text>
 *
 * Attributes:
 * - text: The text to render in handwriting style
 * - animate: Whether to animate the text appearing (default true)
 * - color: Text color (default currentColor)
 */

import { html } from 'htm/preact';
import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { createShadowComponent } from '../lib/shadow-component.js';
import { ErrorBoundary } from '../lib/error-boundary.js';

const styles = `
  :host {
    display: inline-block;
    line-height: 1.2;
  }

  .handwrite-container {
    position: relative;
    display: inline-block;
  }

  .handwrite-text {
    /* Use display fonts already loaded, with cursive fallbacks */
    font-family: var(--font-display, 'Bodoni Moda'), 'Snell Roundhand', 'Segoe Script', 'Bradley Hand', cursive;
    font-size: clamp(1.4rem, 3.5vw, 2rem);
    font-weight: 400;
    font-style: italic;
    color: var(--handwrite-color, currentColor);
    letter-spacing: 0.02em;
    line-height: 1.3;
    white-space: nowrap;

    /* Subtle ink variation */
    text-shadow:
      0.5px 0.5px 0 rgba(0, 0, 0, 0.03),
      -0.3px 0.3px 0 rgba(255, 255, 255, 0.05);
  }

  /* Animation */
  :host([animate]) .handwrite-text {
    animation: handwrite-appear 0.8s ease-out forwards;
    opacity: 0;
  }

  @keyframes handwrite-appear {
    0% {
      opacity: 0;
      transform: translateY(5px);
      filter: blur(2px);
    }
    50% {
      filter: blur(0);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
      filter: blur(0);
    }
  }

  /* Pen stroke underline effect */
  .handwrite-text::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 5%;
    width: 90%;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      currentColor 15%,
      currentColor 85%,
      transparent 100%
    );
    opacity: 0.15;
    transform: scaleX(0);
    transform-origin: left;
  }

  :host([animate]) .handwrite-text::after {
    animation: underline-draw 0.6s ease-out 0.4s forwards;
  }

  @keyframes underline-draw {
    to {
      transform: scaleX(1);
    }
  }

  /* Character stagger effect for longer texts */
  .char {
    display: inline-block;
    animation: char-appear 0.4s ease-out forwards;
    animation-delay: var(--delay, 0s);
    opacity: 0;
  }

  @keyframes char-appear {
    0% {
      opacity: 0;
      transform: translateY(8px) rotate(-5deg);
    }
    100% {
      opacity: 1;
      transform: translateY(0) rotate(0deg);
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .handwrite-text,
    .handwrite-text::after,
    .char {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }
  }
`;

function HandwriteText({ host, text, animate, color }) {
  const displayText = useSignal(text || '');
  const shouldAnimate = useSignal(animate !== false && animate !== 'false');
  const textColor = useSignal(color || '');

  // Update text when prop changes
  useEffect(() => {
    displayText.value = text || '';
  }, [text]);

  // Update animation flag when prop changes
  useEffect(() => {
    shouldAnimate.value = animate !== false && animate !== 'false';
  }, [animate]);

  // Update color CSS variable when prop changes
  useEffect(() => {
    if (color) {
      host.style.setProperty('--handwrite-color', color);
      textColor.value = color;
    }
  }, [color]);

  // Public API
  host.setText = (newText) => {
    displayText.value = newText;
  };

  host.regenerate = () => {
    displayText.value = displayText.value;
  };

  // Render character-by-character for shorter texts with animation
  const renderContent = () => {
    const currentText = displayText.value;

    if (shouldAnimate.value && currentText.length <= 50) {
      // Character-by-character animation
      return currentText.split('').map((char, i) => {
        if (char === ' ') return ' ';
        const delay = i * 0.03; // 30ms per character
        return html`<span class="char" style=${{ '--delay': `${delay}s` }}>${char}</span>`;
      });
    } else {
      // Simple text for longer content or no animation
      return currentText;
    }
  };

  return html`
    <${ErrorBoundary} name="HandwriteText">
      <div class="handwrite-container">
        <span class="handwrite-text">${renderContent()}</span>
      </div>
    <//>
  `;
}

export default createShadowComponent(HandwriteText, { tag: 'handwrite-text', styles });
