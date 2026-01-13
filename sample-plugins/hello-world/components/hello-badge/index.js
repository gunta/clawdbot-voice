/**
 * Hello Badge Component
 * A simple greeting badge that appears when the plugin is active
 */

import { html } from 'htm/preact';
import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';

export default function HelloBadge({ host }) {
  const visible = useSignal(true);
  const message = useSignal('Hello from a plugin!');
  
  // Auto-hide after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      visible.value = false;
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Allow re-showing via host method
  useEffect(() => {
    host.show = () => {
      visible.value = true;
    };
    
    host.hide = () => {
      visible.value = false;
    };
    
    host.setMessage = (msg) => {
      message.value = msg;
    };
  }, []);
  
  if (!visible.value) {
    return null;
  }
  
  return html`
    <div class="badge" onClick=${() => visible.value = false}>
      <span class="wave">👋</span>
      <span class="text">${message}</span>
      <button class="close" type="button" aria-label="Close">×</button>
    </div>
  `;
}
