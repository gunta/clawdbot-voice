# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CLAWD OS1 is a voice companion Progressive Web App built with pure vanilla JavaScript and Web Components. It features two voice personas (Clawd the lobster and Her the assistant) with speech recognition, synthesis, and WebGPU-powered audio visualization. No build step required.

## Development Commands

```bash
npm run serve              # Start local dev server at http://localhost:3000
npm run deploy:cloudflare  # Deploy to Cloudflare Pages
npm run deploy:vercel      # Deploy to Vercel
```

No build step, linting, or test commands - the project uses vanilla JS served directly.

## Architecture

### Core Layers

**Entry Point**: `index.html` loads `src/app.js` which bootstraps the application:
1. Initializes XState navigation service
2. Caches DOM elements
3. Initializes voice and speech controllers
4. Sets up keyboard shortcuts (Cmd+K/P for command palette)
5. Registers service worker (production only)

### Components (`src/components/`)
Native Web Components using Shadow DOM and Declarative Shadow DOM for SSR:
- **Voice UI**: `voice-card.js`, `speak-button.js`, `gpu-waveform.js`, `wave-form.js`
- **OS Chrome**: `os-header.js`, `app-header.js`, `app-footer.js`, `launchpad-view.js`
- **Apps**: `files-app.js`, `coder-app.js`, `commands-app.js`, `settings-app.js`, `image-viewer-app.js`, `clock-modal.js`
- **Utilities**: `transcription-display.js`, `status-display.js`, `drop-zone.js`, `text-editor.js`

Each component has a corresponding CSS file in `src/components/styles/`.

### Services (`src/services/`)
Singleton services providing core functionality:
- **Voice**: `speech-recognition.js`, `speech-synthesis.js`, `audio-analyzer.js`, `audio-player.js`
- **Navigation**: `navigation-service.js` (XState-powered window/modal navigation)
- **Filesystem**: `agentfs.js` (SQLite WASM-based virtual filesystem)
- **State**: `app-context.js` (inter-app communication), `storage.js` (localStorage wrapper)
- **UX**: `haptic.js`, `wake-lock.js`, `chimes.js`, `system-sounds.js`

### Controllers (`src/controllers/`)
Coordinate between services and UI:
- `voice-controller.js` - Manages voice persona playback
- `speech-controller.js` - Handles speech recognition/synthesis flow
- `keyboard-controller.js` - Global keyboard shortcuts

### State Machines (`src/machines/`)
XState v5 state machines:
- `navigation-machine.js` - Window stack navigation with back/forward/modal support

### Vendor (`src/vendor/`)
Third-party libraries (no npm for these):
- `database-wasm.js` - SQLite WASM (~9.5MB)
- `agentfs-browser.js` - AgentFS SDK
- `xterm/` - Terminal emulator for commands-app
- `calligrapher/` - Handwriting support
- `wasm-git/` - Git WASM implementation

## Key Patterns

### Component Creation
Components extend `HTMLElement`, use private fields (`#`), and register via `customElements.define()`:
```javascript
class MyComponent extends HTMLElement {
  #shadowRoot;

  constructor() {
    super();
    this.#shadowRoot = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() { /* setup */ }
  disconnectedCallback() { /* cleanup */ }
}
customElements.define('my-component', MyComponent);
```

### Navigation
Apps use the navigation service for window management:
```javascript
import { navigationService } from './services/index.js';
navigationService.push({ id: 'files-app', title: 'Files', data: {} });
navigationService.back();
navigationService.present({ id: 'settings', title: 'Settings' }); // modal
```

### AgentFS Filesystem
Voice-natural naming convention - paths must sound natural when spoken aloud:
- `/memories/` not `/data/`
- `/pictures/` not `/imgs/`
- `/settings/config.json` for OS configuration

## Important Conventions

- **No framework** - Pure vanilla JavaScript, ES modules
- **Self-hosted assets** - Fonts, WASM files for offline support
- **Voice-natural naming** - File/folder names must be speakable
- **Shadow DOM isolation** - Components use Shadow DOM for encapsulation
- **COOP/COEP headers** - Required for SharedArrayBuffer (WASM)
- **Node >= 18** required
