/**
 * Launchpad View Component
 * Full-screen app launcher with Command Palette (Raycast/Warp-style)
 * Behavior only - template is in HTML via Declarative Shadow DOM
 * 
 * Features:
 * - App grid for quick launch
 * - Command Palette for searching apps, commands, and files
 * - Smart command detection (runs shell commands in terminal)
 */

import { appContext, systemSounds, navigationService } from '../services/index.js';

// Apps that should be presented as modals (overlay)
const MODAL_APPS = new Set(['clock', 'settings']);

// Apps that should be pushed to navigation stack
const STACK_APPS = new Set(['files', 'coder', 'commands', 'image-viewer']);

// App metadata for search
const APP_DATA = [
  { id: 'files', name: 'Files', aliases: ['finder', 'browser', 'documents'], icon: 'folder' },
  { id: 'coder', name: 'Code', aliases: ['editor', 'monaco', 'code editor', 'ide'], icon: 'code' },
  { id: 'commands', name: 'Terminal', aliases: ['shell', 'bash', 'console', 'command line', 'cli'], icon: 'terminal' },
  { id: 'voice', name: 'Voice', aliases: ['assistant', 'talk', 'speak', 'listen'], icon: 'mic' },
  { id: 'settings', name: 'Settings', aliases: ['preferences', 'config', 'configuration', 'options'], icon: 'settings' },
  { id: 'image-viewer', name: 'Images', aliases: ['photos', 'gallery', 'pictures', 'viewer'], icon: 'image' },
  { id: 'clock', name: 'Clock', aliases: ['time', 'watch', 'timer'], icon: 'clock' },
];

// Common shell commands that should open in terminal
const SHELL_COMMANDS = new Set([
  'ls', 'cd', 'pwd', 'cat', 'echo', 'mkdir', 'rm', 'cp', 'mv', 'touch',
  'grep', 'find', 'head', 'tail', 'wc', 'sort', 'curl', 'wget', 'git',
  'npm', 'node', 'python', 'pip', 'which', 'man', 'tree', 'env', 'export',
]);

export class LaunchpadView extends HTMLElement {
  #closeBtn = null;
  #appsGrid = null;
  #searchInput = null;
  #clearBtn = null;
  #shortcutHint = null;
  #resultsContainer = null;
  #boundHandleKeyDown = null;
  #searchResults = [];
  #selectedIndex = 0;

  connectedCallback() {
    this.#closeBtn = this.shadowRoot?.querySelector('.close-btn');
    this.#appsGrid = this.shadowRoot?.querySelector('.apps-grid');
    this.#searchInput = this.shadowRoot?.querySelector('.command-input');
    this.#clearBtn = this.shadowRoot?.querySelector('.command-clear');
    this.#shortcutHint = this.shadowRoot?.querySelector('.command-shortcut');
    this.#resultsContainer = this.shadowRoot?.querySelector('.search-results');

    // Close button handler
    this.#closeBtn?.addEventListener('click', () => this.close());

    // Clear button handler
    this.#clearBtn?.addEventListener('click', () => this.#handleClearClick());

    // App card click handlers
    this.#appsGrid?.querySelectorAll('.app-card').forEach(card => {
      card.addEventListener('click', (e) => this.#handleAppClick(e));
    });

    // Search input handlers
    this.#searchInput?.addEventListener('input', (e) => this.#handleSearchInput(e));
    this.#searchInput?.addEventListener('keydown', (e) => this.#handleSearchKeydown(e));

    // Keyboard navigation
    this.#boundHandleKeyDown = this.#handleKeyDown.bind(this);
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this.#boundHandleKeyDown);
  }

  /**
   * Open the launchpad
   */
  open() {
    this.setAttribute('open', '');
    document.addEventListener('keydown', this.#boundHandleKeyDown);
    systemSounds.open();
    
    // Clear search state
    this.#clearSearch();

    // Focus search input - use timeout to ensure visibility after CSS transition
    setTimeout(() => {
      // Query again in case it wasn't cached
      const input = this.#searchInput || this.shadowRoot?.querySelector('.command-input');
      if (input) {
        input.focus();
      }
    }, 100);

    this.dispatchEvent(new CustomEvent('launchpad-open', { bubbles: true }));
  }

  /**
   * Close the launchpad
   */
  close() {
    this.removeAttribute('open');
    document.removeEventListener('keydown', this.#boundHandleKeyDown);
    systemSounds.close();
    
    // Clear search
    this.#clearSearch();
    
    this.dispatchEvent(new CustomEvent('launchpad-close', { bubbles: true }));
  }

  /**
   * Toggle open/close
   */
  toggle() {
    if (this.hasAttribute('open')) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Clear search state
   */
  #clearSearch() {
    if (this.#searchInput) {
      this.#searchInput.value = '';
    }
    // Show shortcut hint, hide clear button
    this.#toggleClearButton(false);
    this.#searchResults = [];
    this.#selectedIndex = 0;
    this.#renderResults();
    this.#showAppsGrid(true);
  }

  /**
   * Handle clear button click
   */
  #handleClearClick() {
    this.#clearSearch();
    this.#searchInput?.focus();
  }

  /**
   * Show/hide apps grid
   */
  #showAppsGrid(show) {
    if (this.#appsGrid) {
      this.#appsGrid.style.display = show ? '' : 'none';
    }
    if (this.#resultsContainer) {
      this.#resultsContainer.style.display = show ? 'none' : '';
    }
  }

  /**
   * Handle keyboard events
   */
  #handleKeyDown(e) {
    if (e.key === 'Escape') {
      // If search has content, clear it first
      if (this.#searchInput?.value) {
        this.#clearSearch();
        this.#searchInput?.focus();
      } else {
        this.close();
      }
    }
  }

  /**
   * Handle search input
   */
  #handleSearchInput(e) {
    const query = e.target.value.trim();
    const hasContent = !!e.target.value;

    // Toggle between clear button and shortcut hint
    this.#toggleClearButton(hasContent);

    if (!query) {
      this.#clearSearch();
      return;
    }

    this.#searchResults = this.#search(query);
    this.#selectedIndex = 0;
    this.#renderResults();
    this.#showAppsGrid(false);
  }

  /**
   * Toggle clear button visibility (replaces shortcut hint)
   */
  #toggleClearButton(show) {
    if (this.#clearBtn) {
      this.#clearBtn.classList.toggle('visible', show);
    }
    if (this.#shortcutHint) {
      this.#shortcutHint.style.display = show ? 'none' : '';
    }
  }

  /**
   * Handle keyboard in search input
   */
  #handleSearchKeydown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.#selectedIndex = Math.min(this.#selectedIndex + 1, this.#searchResults.length - 1);
        this.#renderResults();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        this.#selectedIndex = Math.max(this.#selectedIndex - 1, 0);
        this.#renderResults();
        break;
        
      case 'Enter':
        e.preventDefault();
        if (this.#searchResults.length > 0) {
          this.#executeResult(this.#searchResults[this.#selectedIndex]);
        } else if (this.#searchInput?.value.trim()) {
          // No results but has input - try to execute as command
          this.#executeCommand(this.#searchInput.value.trim());
        }
        break;
        
      case 'Tab':
        e.preventDefault();
        // Autocomplete from selected result
        if (this.#searchResults.length > 0) {
          const result = this.#searchResults[this.#selectedIndex];
          if (result.type === 'app') {
            this.#searchInput.value = result.name;
          }
        }
        break;
    }
  }

  /**
   * Search apps, commands, and files
   */
  #search(query) {
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

  /**
   * Render search results
   */
  #renderResults() {
    if (!this.#resultsContainer) return;
    
    if (this.#searchResults.length === 0) {
      this.#resultsContainer.innerHTML = `
        <div class="no-results">
          <span>Type to search apps, run commands, or find files</span>
        </div>
      `;
      return;
    }
    
    this.#resultsContainer.innerHTML = this.#searchResults.map((result, index) => `
      <div class="result-item ${index === this.#selectedIndex ? 'selected' : ''}" 
           data-index="${index}"
           tabindex="0"
           role="option"
           aria-selected="${index === this.#selectedIndex}">
        <div class="result-icon">${this.#getResultIcon(result.icon)}</div>
        <div class="result-content">
          <span class="result-name">${result.name}</span>
          <span class="result-description">${result.description}</span>
        </div>
        <div class="result-shortcut">
          ${index === this.#selectedIndex ? '↵' : ''}
        </div>
      </div>
    `).join('');
    
    // Add click handlers
    this.#resultsContainer.querySelectorAll('.result-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.index, 10);
        this.#executeResult(this.#searchResults[idx]);
      });
    });
  }

  /**
   * Get SVG icon for result type
   */
  #getResultIcon(iconType) {
    const icons = {
      folder: '<svg viewBox="0 0 24 24"><path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z"/></svg>',
      code: '<svg viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
      terminal: '<svg viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
      mic: '<svg viewBox="0 0 24 24"><path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z"/><path d="M19 10V12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12V10"/></svg>',
      settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
      image: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
      clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
      'file-plus': '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>',
    };
    return icons[iconType] || icons.folder;
  }

  /**
   * Execute a search result
   */
  #executeResult(result) {
    systemSounds.launch();
    
    switch (result.type) {
      case 'app':
        this.#launchApp(result.id);
        break;
        
      case 'command':
        this.#executeCommand(result.command);
        break;
        
      case 'search':
        this.#searchFiles(result.query);
        break;
        
      case 'create':
        this.#createFile(result.filename);
        break;
    }
  }

  /**
   * Execute a shell command
   */
  #executeCommand(command) {
    // Close launchpad first
    this.close();
    
    // Push terminal to navigation and pass the command
    navigationService.push('commands', 'Terminal', { command });
    
    appContext.recordAction('launchpad', 'run-command', { command });
  }

  /**
   * Search for files
   */
  async #searchFiles(query) {
    // Close launchpad and open files with search
    this.close();
    
    navigationService.push('files', 'Files', { search: query });
    
    appContext.recordAction('launchpad', 'search-files', { query });
  }

  /**
   * Create a new file
   */
  async #createFile(filename) {
    // Close launchpad and open coder with new file
    this.close();
    
    // Determine if it's a code file
    const ext = filename.split('.').pop()?.toLowerCase();
    const codeExts = ['js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'css', 'html', 'json', 'md'];
    
    if (codeExts.includes(ext)) {
      navigationService.push('coder', filename, { newFile: filename });
    } else {
      navigationService.push('files', 'Files', { newFile: filename });
    }
    
    appContext.recordAction('launchpad', 'create-file', { filename });
  }

  /**
   * Handle app card click
   */
  #handleAppClick(e) {
    const card = e.currentTarget;
    const appId = card.dataset.app;
    
    if (!appId) return;
    
    systemSounds.launch();
    appContext.recordAction('launchpad', 'launch-app', { appId });
    
    this.dispatchEvent(new CustomEvent('app-launch', {
      bubbles: true,
      detail: { appId }
    }));
    
    // If it's the voice app (home), just close launchpad
    if (appId === 'voice') {
      this.close();
      return;
    }
    
    this.#launchApp(appId);
  }

  /**
   * Launch an app
   */
  #launchApp(appId) {
    const appData = APP_DATA.find(a => a.id === appId);
    const title = appData?.name || appId;
    
    // Close launchpad first
    this.close();
    
    // Then launch the app based on type
    if (MODAL_APPS.has(appId)) {
      // Present as modal overlay
      navigationService.present(appId);
    } else if (STACK_APPS.has(appId)) {
      // Push to navigation stack
      navigationService.push(appId, title);
    } else {
      // Fallback: try to open directly (legacy apps)
      const appElement = document.querySelector(`${appId}-app`);
      if (appElement && typeof appElement.open === 'function') {
        appElement.open();
      }
    }
  }

  /**
   * Check if launchpad is open
   */
  get isOpen() {
    return this.hasAttribute('open');
  }
}

customElements.define('launchpad-view', LaunchpadView);
