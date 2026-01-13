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
import { createShadowComponent } from '../shared/shadow-component.js';
import { ErrorBoundary } from '../shared/error-boundary.js';

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

export default createShadowComponent(HandwriteText, { 
  tag: 'handwrite-text', 
  styleUrl: new URL('./styles.css', import.meta.url).href 
});
