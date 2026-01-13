/**
 * CLAWD OS1 Components
 * Auto-registers all Preact shadow components as custom elements
 */

// Core UI Components
import './status-display/index.js';
import './speak-button/index.js';
import './wave-form/index.js';
import './gpu-waveform/index.js';
import './transcription-display/index.js';

// Card Components
import './voice-card/index.js';

// App Components
import './launchpad-view/index.js';
import './settings-app/index.js';
import './files-app/index.js';
import './commands-app/index.js';
import './coder-app/index.js';
import './image-viewer-app/index.js';
import './connections-app/index.js';

// Modal & Overlay Components
import './clock-modal/index.js';
import './app-header/index.js';
import './app-footer/index.js';

// Main Shell
import './clawd-os1/index.js';

// Legacy components (if any still needed during transition)
import './os-header/index.js';
import './text-editor/index.js';
import './drop-zone/index.js';
import './handwrite-text/index.js';

// Plugin System
import './plugin-slot/index.js';

console.log('[CLAWD] All components registered');
