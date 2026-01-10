/**
 * CLAWD OS1 Components
 * Auto-registers all Preact shadow components as custom elements
 */

// Core UI Components
import './status-display.js';
import './speak-button.js';
import './wave-form.js';
import './gpu-waveform.js';
import './transcription-display.js';

// Card Components
import './voice-card.js';

// App Components
import './launchpad-view.js';
import './settings-app.js';
import './files-app.js';
import './commands-app.js';
import './coder-app.js';
import './image-viewer-app.js';
import './connections-app.js';

// Modal & Overlay Components
import './clock-modal.js';
import './app-header.js';
import './app-footer.js';

// Main Shell
import './clawd-os1.js';

// Legacy components (if any still needed during transition)
import './os-header.js';
import './text-editor.js';
import './drop-zone.js';
import './handwrite-text.js';

console.log('[CLAWD] All components registered');