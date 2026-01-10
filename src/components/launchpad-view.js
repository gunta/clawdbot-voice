/**
 * Launchpad View Component
 * App launcher grid with search/command palette
 * Migrated to Preact + HTM + Signals
 */
import { html } from 'htm/preact';
import { useSignal, useComputed } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { createShadowComponent } from '../lib/shadow-component.js';
import { ErrorBoundary } from '../lib/error-boundary.js';
import { navigate, currentApp } from '../services/navigation-signals.js';
import { systemSounds, appContext } from '../services/index.js';

const styles = `
/* Launchpad View - Her Aesthetic */
/* Elegant, minimal app launcher with terracotta background */

:host {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--color-red, oklch(0.55 0.155 25));
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.4s ease, visibility 0.4s ease;
  dynamic-range-limit: no-limit;
  contain: content;
}

:host([open]) {
  opacity: 1;
  visibility: visible;
}

/* Header */
.header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-family: var(--font-body, 'Cormorant Garamond', serif);
  font-style: italic;
  font-size: 1.1rem;
  font-weight: 400;
  color: oklch(1 0 0 / 0.85);
  letter-spacing: 0.08em;
}

/* Close button - elegant circle */
.close-btn {
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid oklch(1 0 0 / 0.35);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.15s ease;
}

.close-btn:hover {
  border-color: oklch(1 0 0 / 0.7);
  background: oklch(1 0 0 / 0.1);
  transform: scale(1.02);
}

.close-btn:active {
  transform: scale(0.96);
  transition: transform 0.08s ease;
}

.close-btn svg {
  width: 1rem;
  height: 1rem;
  stroke: oklch(1 0 0 / 0.6);
  stroke-width: 1.5;
  stroke-linecap: round;
  fill: none;
  transition: stroke 0.15s ease;
}

.close-btn:hover svg {
  stroke: oklch(1 0 0 / 0.95);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Command Palette - Raycast/Warp-style search
   ═══════════════════════════════════════════════════════════════════════════ */

.command-palette {
  width: 100%;
  max-width: 560px;
  padding: 0 2rem;
  margin-bottom: 2rem;
  opacity: 0;
  transform: translateY(-10px);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

:host([open]) .command-palette {
  opacity: 1;
  transform: translateY(0);
}

.command-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: oklch(0 0 0 / 0.2);
  border: 1px solid oklch(1 0 0 / 0.15);
  border-radius: 16px;
  padding: 0 1rem;
  transition: all 0.2s ease;
}

.command-input-wrapper:focus-within {
  background: oklch(0 0 0 / 0.3);
  border-color: oklch(1 0 0 / 0.35);
  box-shadow: 0 8px 32px oklch(0 0 0 / 0.2);
}

.command-icon {
  width: 1.25rem;
  height: 1.25rem;
  stroke: oklch(1 0 0 / 0.5);
  stroke-width: 2;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}

.command-input-wrapper:focus-within .command-icon {
  stroke: oklch(1 0 0 / 0.8);
}

.command-input {
  flex: 1;
  height: 3rem;
  padding: 0 0.75rem;
  background: transparent;
  border: none;
  outline: none;
  font-family: 'SF Pro Text', -apple-system, system-ui, sans-serif;
  font-size: 1rem;
  color: oklch(1 0 0 / 0.95);
  caret-color: oklch(1 0 0 / 0.8);
}

.command-input::placeholder {
  color: oklch(1 0 0 / 0.4);
  font-style: italic;
}

/* Clear button - replaces shortcut when input has content */
.command-clear {
  display: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 50%;
  background: oklch(1 0 0 / 0.1);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease;
}

.command-clear.visible {
  display: flex;
}

.command-clear:hover {
  background: oklch(1 0 0 / 0.18);
}

.command-clear:active {
  background: oklch(1 0 0 / 0.25);
}

.command-clear svg {
  width: 14px;
  height: 14px;
  stroke: oklch(1 0 0 / 0.6);
  stroke-width: 2;
  stroke-linecap: round;
}

.command-clear:hover svg {
  stroke: oklch(1 0 0 / 0.85);
}

.command-shortcut {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.75rem;
  color: oklch(1 0 0 / 0.35);
  padding: 0.25rem 0.5rem;
  background: oklch(1 0 0 / 0.08);
  border-radius: 6px;
  flex-shrink: 0;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Search Results
   ═══════════════════════════════════════════════════════════════════════════ */

.search-results {
  width: 100%;
  max-width: 560px;
  max-height: 400px;
  overflow-y: auto;
  padding: 0 2rem;
  margin-bottom: 1rem;
}

.no-results {
  text-align: center;
  padding: 2rem;
  color: oklch(1 0 0 / 0.5);
  font-style: italic;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.result-item:hover,
.result-item.selected {
  background: oklch(1 0 0 / 0.12);
}

.result-item.selected {
  background: oklch(1 0 0 / 0.18);
}

.result-icon {
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: oklch(1 0 0 / 0.08);
  border-radius: 10px;
  flex-shrink: 0;
}

.result-icon svg {
  width: 1.25rem;
  height: 1.25rem;
  stroke: oklch(1 0 0 / 0.75);
  stroke-width: 1.75;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.result-content {
  flex: 1;
  min-width: 0;
}

.result-name {
  display: block;
  font-size: 0.95rem;
  font-weight: 500;
  color: oklch(1 0 0 / 0.95);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-description {
  display: block;
  font-size: 0.8rem;
  color: oklch(1 0 0 / 0.5);
  margin-top: 0.125rem;
}

.result-shortcut {
  font-size: 1rem;
  color: oklch(1 0 0 / 0.4);
  flex-shrink: 0;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Apps Grid
   ═══════════════════════════════════════════════════════════════════════════ */

/* Apps Grid */
.apps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3rem;
  padding: 2rem;
  max-width: 500px;
}

@media (max-width: 480px) {
  .apps-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 2.5rem;
  }
}

/* App Card - minimal, just icon + name */
.app-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  padding: 1.25rem;
  border-radius: var(--radius-md, 20px);
  transition: all 0.3s ease;
  opacity: 0;
  transform: translateY(15px);
}

:host([open]) .app-card {
  opacity: 1;
  transform: translateY(0);
}

/* Staggered animation */
:host([open]) .app-card:nth-child(1) { transition-delay: 0.05s; }
:host([open]) .app-card:nth-child(2) { transition-delay: 0.1s; }
:host([open]) .app-card:nth-child(3) { transition-delay: 0.15s; }
:host([open]) .app-card:nth-child(4) { transition-delay: 0.2s; }
:host([open]) .app-card:nth-child(5) { transition-delay: 0.25s; }
:host([open]) .app-card:nth-child(6) { transition-delay: 0.3s; }

.app-card:hover {
  background: oklch(1 0 0 / 0.08);
  transform: scale(1.05);
}

.app-card:active {
  transform: scale(0.98);
  transition: transform 0.08s ease;
}

/* App Icon - NO border, just the beautiful vector icon */
.app-icon {
  width: 4rem;
  height: 4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.app-card:hover .app-icon {
  transform: scale(1.05);
}

/* Icon SVG - clean line art */
.app-icon svg {
  width: 2.5rem;
  height: 2.5rem;
  stroke: oklch(1 0 0 / 0.85);
  stroke-width: 1.25;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: stroke 0.2s ease;
}

.app-card:hover .app-icon svg {
  stroke: oklch(1 0 0);
}

/* App Name - elegant serif */
.app-name {
  font-family: var(--font-body, 'Cormorant Garamond', serif);
  font-style: italic;
  font-size: 0.9rem;
  color: oklch(1 0 0 / 0.7);
  letter-spacing: 0.06em;
  transition: color 0.2s ease;
}

.app-card:hover .app-name {
  color: oklch(1 0 0 / 0.95);
}

/* Active App Indicator - subtle underline */
.app-card[data-active="true"] .app-name {
  color: oklch(1 0 0 / 0.95);
}

.app-card[data-active="true"] .app-name::after {
  content: '';
  display: block;
  width: 100%;
  height: 1px;
  background: oklch(1 0 0 / 0.5);
  margin-top: 0.25rem;
}

/* Keyboard focus */
.app-card:focus-visible {
  outline: 1px solid oklch(1 0 0 / 0.6);
  outline-offset: 4px;
}

/* HDR Enhancement */
@media (dynamic-range: high) {
  .close-btn:hover {
    border-color: var(--hdr-white-bright, oklch(1.15 0 0));
  }

  .app-card:hover .app-icon svg {
    stroke: var(--hdr-white-peak, oklch(1.5 0 0));
  }

  .app-card:hover .app-name {
    color: var(--hdr-white-bright, oklch(1.15 0 0));
  }
}
`;

// Apps that should be presented as modals (overlay)
const MODAL_APPS = new Set(['clock', 'settings']);

// Apps that should be pushed to navigation stack
const STACK_APPS = new Set(['files', 'coder', 'commands', 'image-viewer', 'connections']);

// App metadata for search
const APP_DATA = [
  { id: 'files', name: 'Files', aliases: ['finder', 'browser', 'documents'], icon: 'folder' },
  { id: 'coder', name: 'Code', aliases: ['editor', 'monaco', 'code editor', 'ide'], icon: 'code' },
  { id: 'commands', name: 'Terminal', aliases: ['shell', 'bash', 'console', 'command line', 'cli'], icon: 'terminal' },
  { id: 'voice', name: 'Voice', aliases: ['assistant', 'talk', 'speak', 'listen'], icon: 'mic' },
  { id: 'settings', name: 'Settings', aliases: ['preferences', 'config', 'configuration', 'options'], icon: 'settings' },
  { id: 'image-viewer', name: 'Images', aliases: ['photos', 'gallery', 'pictures', 'viewer'], icon: 'image' },
  { id: 'clock', name: 'Clock', aliases: ['time', 'watch', 'timer'], icon: 'clock' },
  { id: 'connections', name: 'Connections', aliases: ['data', 'sync', 'backup', 'export', 'import', 'database', 'cloud'], icon: 'cloud' },
];

// Common shell commands that should open in terminal
const SHELL_COMMANDS = new Set([
  'ls', 'cd', 'pwd', 'cat', 'echo', 'mkdir', 'rm', 'cp', 'mv', 'touch',
  'grep', 'find', 'head', 'tail', 'wc', 'sort', 'curl', 'wget', 'git',
  'npm', 'node', 'python', 'pip', 'which', 'man', 'tree', 'env', 'export',
]);

/**
 * Get SVG icon for app/result type
 */
function getIcon(iconType) {
  const icons = {
    folder: html`<svg viewBox="0 0 24 24"><path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z"/></svg>`,
    code: html`<svg viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    terminal: html`<svg viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
    mic: html`<svg viewBox="0 0 24 24"><path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z"/><path d="M19 10V12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12V10"/></svg>`,
    settings: html`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    image: html`<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    clock: html`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    search: html`<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    'file-plus': html`<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`,
    cloud: html`<svg viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>`,
  };
  return icons[iconType] || icons.folder;
}

/**
 * Search apps, commands, and files
 */
function searchApps(query) {
  const results = [];
  const lowerQuery = query.toLowerCase();

  // Check if it looks like a shell command
  const firstWord = query.split(/\s+/)[0].toLowerCase();
  const isShellCommand = SHELL_COMMANDS.has(firstWord) ||
                        query.startsWith('./') ||
                        query.startsWith('/') ||
                        query.includes('|') ||
                        query.includes('>');

  // If it's a shell command, show "Run in Terminal" option first
  if (isShellCommand) {
    results.push({
      type: 'command',
      id: 'run-command',
      name: `Run: ${query}`,
      description: 'Execute in Terminal',
      command: query,
      icon: 'terminal',
    });
  }

  // Search apps
  for (const app of APP_DATA) {
    const nameMatch = app.name.toLowerCase().includes(lowerQuery);
    const aliasMatch = app.aliases.some(a => a.includes(lowerQuery));

    if (nameMatch || aliasMatch) {
      results.push({
        type: 'app',
        id: app.id,
        name: app.name,
        description: `Open ${app.name}`,
        icon: app.icon,
      });
    }
  }

  // Add "Search files" option
  if (query.length >= 2) {
    results.push({
      type: 'search',
      id: 'search-files',
      name: `Search: "${query}"`,
      description: 'Find files and documents',
      query: query,
      icon: 'search',
    });
  }

  // Add "Create file" option
  if (query.includes('.') && !query.includes(' ')) {
    results.push({
      type: 'create',
      id: 'create-file',
      name: `Create: ${query}`,
      description: 'Create new file',
      filename: query,
      icon: 'file-plus',
    });
  }

  return results;
}

function LaunchpadView({ host }) {
  const searchQuery = useSignal('');
  const isVisible = useSignal(false);
  const selectedIndex = useSignal(0);

  const filteredApps = useComputed(() => {
    const query = searchQuery.value.toLowerCase();
    if (!query) return APP_DATA;
    return APP_DATA.filter(app =>
      app.name.toLowerCase().includes(query) ||
      app.aliases.some(a => a.toLowerCase().includes(query))
    );
  });

  const searchResults = useComputed(() => {
    const query = searchQuery.value.trim();
    if (!query) return [];
    return searchApps(query);
  });

  const showingResults = useComputed(() => searchQuery.value.trim().length > 0);

  /**
   * Launch an app
   */
  const launchApp = (appId) => {
    const appData = APP_DATA.find(a => a.id === appId);
    const title = appData?.name || appId;

    systemSounds.launch();
    appContext.recordAction('launchpad', 'launch-app', { appId });

    // Close launchpad first
    host.close();

    // If it's the voice app (home), just return
    if (appId === 'voice') {
      return;
    }

    // Then launch the app based on type
    if (MODAL_APPS.has(appId)) {
      // Present as modal overlay
      navigate.present(appId);
    } else if (STACK_APPS.has(appId)) {
      // Push to navigation stack
      navigate.push(appId, title);
    } else {
      // Fallback: try to open directly (legacy apps)
      const appElement = document.querySelector(`${appId}-app`);
      if (appElement && typeof appElement.open === 'function') {
        appElement.open();
      }
    }
  };

  /**
   * Execute a search result
   */
  const executeResult = (result) => {
    systemSounds.launch();

    switch (result.type) {
      case 'app':
        launchApp(result.id);
        break;

      case 'command':
        executeCommand(result.command);
        break;

      case 'search':
        searchFiles(result.query);
        break;

      case 'create':
        createFile(result.filename);
        break;
    }
  };

  /**
   * Execute a shell command
   */
  const executeCommand = (command) => {
    host.close();
    navigate.push('commands', 'Terminal', { command });
    appContext.recordAction('launchpad', 'run-command', { command });
  };

  /**
   * Search for files
   */
  const searchFiles = (query) => {
    host.close();
    navigate.push('files', 'Files', { search: query });
    appContext.recordAction('launchpad', 'search-files', { query });
  };

  /**
   * Create a new file
   */
  const createFile = (filename) => {
    host.close();

    // Determine if it's a code file
    const ext = filename.split('.').pop()?.toLowerCase();
    const codeExts = ['js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'css', 'html', 'json', 'md'];

    if (codeExts.includes(ext)) {
      navigate.push('coder', filename, { newFile: filename });
    } else {
      navigate.push('files', 'Files', { newFile: filename });
    }

    appContext.recordAction('launchpad', 'create-file', { filename });
  };

  const handleAppClick = (appId) => {
    launchApp(appId);
  };

  const handleClose = () => {
    host.close();
  };

  const handleSearchInput = (e) => {
    searchQuery.value = e.target.value;
    selectedIndex.value = 0;
  };

  const handleClearClick = () => {
    searchQuery.value = '';
    selectedIndex.value = 0;
  };

  const handleSearchKeydown = (e) => {
    const results = searchResults.value;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex.value = Math.min(selectedIndex.value + 1, results.length - 1);
        break;

      case 'ArrowUp':
        e.preventDefault();
        selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
        break;

      case 'Enter':
        e.preventDefault();
        if (results.length > 0) {
          executeResult(results[selectedIndex.value]);
        } else if (searchQuery.value.trim()) {
          // No results but has input - try to execute as command
          executeCommand(searchQuery.value.trim());
        }
        break;

      case 'Tab':
        e.preventDefault();
        // Autocomplete from selected result
        if (results.length > 0) {
          const result = results[selectedIndex.value];
          if (result.type === 'app') {
            searchQuery.value = result.name;
          }
        }
        break;
    }
  };

  // Handle escape key globally when open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isVisible.value) return;

      if (e.key === 'Escape') {
        // If search has content, clear it first
        if (searchQuery.value) {
          searchQuery.value = '';
          selectedIndex.value = 0;
        } else {
          handleClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  // Expose methods
  host.open = () => {
    host.setAttribute('open', '');
    isVisible.value = true;
    systemSounds.open();
    searchQuery.value = '';
    selectedIndex.value = 0;

    // Focus search input after transition
    setTimeout(() => {
      const input = host.shadowRoot?.querySelector('.command-input');
      input?.focus();
    }, 100);

    host.dispatchEvent(new CustomEvent('launchpad-open', { bubbles: true }));
  };

  host.close = () => {
    host.removeAttribute('open');
    isVisible.value = false;
    systemSounds.close();
    searchQuery.value = '';
    selectedIndex.value = 0;

    host.dispatchEvent(new CustomEvent('launchpad-close', { bubbles: true }));
  };

  host.toggle = () => {
    if (host.hasAttribute('open')) {
      host.close();
    } else {
      host.open();
    }
  };

  // Property getter
  if (!Object.getOwnPropertyDescriptor(host, 'isOpen')) {
    Object.defineProperty(host, 'isOpen', {
      configurable: true,
      get: () => host.hasAttribute('open')
    });
  }

  return html`
    <${ErrorBoundary} name="LaunchpadView">
      <div class="header">
        <span class="title">apps</span>
        <button class="close-btn" type="button" onClick=${handleClose} aria-label="Close launchpad">
          <svg viewBox="0 0 24 24" fill="none">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </div>

      <div class="command-palette">
        <div class="command-input-wrapper">
          <svg class="command-icon" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            class="command-input"
            placeholder="Search apps, run commands..."
            value=${searchQuery.value}
            onInput=${handleSearchInput}
            onKeyDown=${handleSearchKeydown}
          />
          <button
            class=${`command-clear ${searchQuery.value ? 'visible' : ''}`}
            onClick=${handleClearClick}
            aria-label="Clear search"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
          ${!searchQuery.value && html`
            <span class="command-shortcut">⌘K</span>
          `}
        </div>
      </div>

      ${showingResults.value ? html`
        <div class="search-results">
          ${searchResults.value.length === 0 ? html`
            <div class="no-results">
              <span>Type to search apps, run commands, or find files</span>
            </div>
          ` : searchResults.value.map((result, index) => html`
            <div
              key=${result.id}
              class=${`result-item ${index === selectedIndex.value ? 'selected' : ''}`}
              onClick=${() => executeResult(result)}
              tabindex="0"
              role="option"
              aria-selected=${index === selectedIndex.value}
            >
              <div class="result-icon">
                ${getIcon(result.icon)}
              </div>
              <div class="result-content">
                <span class="result-name">${result.name}</span>
                <span class="result-description">${result.description}</span>
              </div>
              <div class="result-shortcut">
                ${index === selectedIndex.value ? '↵' : ''}
              </div>
            </div>
          `)}
        </div>
      ` : html`
        <div class="apps-grid">
          ${filteredApps.value.map(app => html`
            <div
              key=${app.id}
              class="app-card"
              data-app=${app.id}
              data-active=${currentApp.value?.id === app.id}
              onClick=${() => handleAppClick(app.id)}
              tabindex="0"
            >
              <div class="app-icon">
                ${getIcon(app.icon)}
              </div>
              <span class="app-name">${app.name}</span>
            </div>
          `)}
        </div>
      `}
    <//>
  `;
}

export default createShadowComponent(LaunchpadView, {
  tag: 'launchpad-view',
  styles,
});
