/**
 * Files App Component
 * Novel spatial file browser with temporal and connected paradigms
 * Behavior only - template is in HTML via Declarative Shadow DOM
 */

import { agentfs, appContext, systemSounds } from '../services/index.js';

export class FilesApp extends HTMLElement {
  #canvas = null;
  #closeBtn = null;
  #backBtn = null;
  #pathElement = null;
  #timeScrubber = null;
  #zoomIndicator = null;
  #boundHandleKeyDown = null;
  
  // State
  #currentPath = '/';
  #files = [];
  #zoom = 1;
  #minZoom = 0.5;
  #maxZoom = 2;
  #isLoading = false;
  #lastPinchDistance = 0;
  #isPinching = false;

  connectedCallback() {
    this.#canvas = this.shadowRoot?.querySelector('.canvas');
    this.#closeBtn = this.shadowRoot?.querySelector('.close-btn');
    this.#backBtn = this.shadowRoot?.querySelector('.back-btn');
    this.#pathElement = this.shadowRoot?.querySelector('.path');
    this.#timeScrubber = this.shadowRoot?.querySelector('.time-slider');
    this.#zoomIndicator = this.shadowRoot?.querySelector('.zoom-indicator');
    
    // Event handlers
    this.#closeBtn?.addEventListener('click', () => this.close());
    this.#backBtn?.addEventListener('click', () => this.#navigateUp());
    
    // Keyboard
    this.#boundHandleKeyDown = this.#handleKeyDown.bind(this);
    
    // Zoom (wheel)
    this.#canvas?.parentElement?.addEventListener('wheel', (e) => this.#handleWheel(e), { passive: false });
    
    // Pinch to zoom (touch)
    const container = this.#canvas?.parentElement;
    if (container) {
      container.addEventListener('touchstart', (e) => this.#handleTouchStart(e), { passive: false });
      container.addEventListener('touchmove', (e) => this.#handleTouchMove(e), { passive: false });
      container.addEventListener('touchend', () => this.#handleTouchEnd());
    }
    
    // Note: Removed "click outside to close" - was causing issues with shadow DOM event retargeting
    // Users can close via the close button or Escape key
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this.#boundHandleKeyDown);
  }

  /**
   * Open the files app
   */
  async open() {
    this.setAttribute('open', '');
    document.addEventListener('keydown', this.#boundHandleKeyDown);
    
    // Play open sound
    systemSounds.open();
    
    // Load files
    await this.#loadFiles();
    
    this.dispatchEvent(new CustomEvent('files-app-open', { bubbles: true }));
  }

  /**
   * Close the files app
   */
  close() {
    this.removeAttribute('open');
    document.removeEventListener('keydown', this.#boundHandleKeyDown);
    
    // Play close sound
    systemSounds.close();
    
    this.dispatchEvent(new CustomEvent('files-app-close', { bubbles: true }));
  }

  /**
   * Navigate to a path
   */
  async navigateTo(path) {
    this.#currentPath = path;
    appContext.recordAction('files', 'navigate', { path });
    await this.#loadFiles();
  }

  /**
   * Navigate up one level (zoom out animation)
   */
  async #navigateUp() {
    if (this.#currentPath === '/' || !this.#canvas) return;
    
    // Play zoom out sound
    systemSounds.zoomOut();
    
    // Animate zoom out
    this.#canvas.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease';
    this.#canvas.style.transform = 'scale(0.5)';
    this.#canvas.style.opacity = '0';
    
    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Update path
    const segments = this.#currentPath.split('/').filter(Boolean);
    segments.pop();
    this.#currentPath = '/' + segments.join('/') || '/';
    this.#zoom = 1;
    
    // Reset to zoomed in state (we're zooming out, so come from zoomed in)
    this.#canvas.style.transition = 'none';
    this.#canvas.style.transform = 'scale(2)';
    this.#canvas.style.opacity = '0';
    
    // Load files
    await this.#loadFiles();
    
    // Animate to normal
    requestAnimationFrame(() => {
      this.#canvas.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease';
      this.#canvas.style.transform = 'scale(1)';
      this.#canvas.style.opacity = '1';
    });
  }

  /**
   * Load files from current path
   */
  async #loadFiles() {
    if (!this.#canvas) return;
    
    this.#isLoading = true;
    this.#showLoading();
    
    try {
      // Initialize AgentFS if needed
      await agentfs.init();
      
      // Get directory contents
      const entries = await agentfs.readdir(this.#currentPath);
      
      // Get stats for each entry to determine type
      this.#files = await Promise.all(
        entries.map(async (name) => {
          const fullPath = this.#currentPath === '/' 
            ? `/${name}` 
            : `${this.#currentPath}/${name}`;
          
          try {
            // Try to determine if it's a directory by checking if we can read it as dir
            const isDir = await this.#isDirectory(fullPath);
            return {
              name,
              path: fullPath,
              type: isDir ? 'folder' : 'file'
            };
          } catch {
            return {
              name,
              path: fullPath,
              type: 'file'
            };
          }
        })
      );
      
      this.#render();
      this.#updatePath();
    } catch (err) {
      console.error('[FilesApp] Failed to load files:', err);
      this.#files = [];
      this.#render();
    } finally {
      this.#isLoading = false;
    }
  }

  /**
   * Check if path is a directory using stat
   */
  async #isDirectory(path) {
    try {
      const agent = await agentfs.getAgent();
      const stats = await agent.fs.stat(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Render files to canvas
   */
  #render() {
    if (!this.#canvas) return;
    
    // Reset any stuck animation states
    this.#canvas.style.opacity = '1';
    this.#canvas.style.pointerEvents = 'auto';
    
    if (this.#files.length === 0) {
      this.#canvas.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24">
            <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="empty-state-text">this space is empty</span>
        </div>
      `;
      return;
    }
    
    // Sort: folders first, then files
    const sorted = [...this.#files].sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });
    
    this.#canvas.innerHTML = sorted.map((file, index) => `
      <div class="node" 
           data-path="${file.path}" 
           data-type="${file.type}"
           tabindex="0"
           role="button"
           aria-label="${file.type === 'folder' ? 'Open folder' : 'Open file'} ${file.name}"
           style="animation-delay: ${index * 0.05}s">
        <div class="node-icon">
          ${file.type === 'folder' ? this.#folderIcon(file.name) : this.#fileIcon(file.name)}
        </div>
        <span class="node-name" title="${file.name}">${file.name}</span>
      </div>
    `).join('');
    
    // Add click handlers to nodes
    this.#canvas.querySelectorAll('.node').forEach(node => {
      node.addEventListener('click', () => this.#handleNodeClick(node));
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.#handleNodeClick(node);
        }
      });
    });
    
    // Apply current zoom
    this.#applyZoom();
  }

  /**
   * Handle node click
   */
  async #handleNodeClick(node) {
    const path = node.dataset.path;
    const type = node.dataset.type;
    
    if (type === 'folder') {
      // Zoom into folder with animation
      await this.#zoomIntoFolder(node, path);
    } else {
      // Preview file
      await this.#previewFile(path);
    }
  }

  /**
   * Zoom into a folder (novel navigation paradigm)
   */
  async #zoomIntoFolder(node, path) {
    if (!this.#canvas) return;
    
    // Play zoom in sound
    systemSounds.zoomIn();
    
    // Get node position relative to canvas center
    const canvasRect = this.#canvas.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    
    const centerX = canvasRect.width / 2;
    const centerY = canvasRect.height / 2;
    const nodeX = nodeRect.left - canvasRect.left + nodeRect.width / 2;
    const nodeY = nodeRect.top - canvasRect.top + nodeRect.height / 2;
    
    // Calculate offset to center on the folder
    const offsetX = centerX - nodeX;
    const offsetY = centerY - nodeY;
    
    // Animate zoom into the folder
    this.#canvas.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    this.#canvas.style.transform = `scale(2.5) translate(${offsetX / 2.5}px, ${offsetY / 2.5}px)`;
    this.#canvas.style.opacity = '0';
    
    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Navigate and reset
    this.#currentPath = path;
    this.#zoom = 1;
    
    // Reset canvas position instantly (no transition)
    this.#canvas.style.transition = 'none';
    this.#canvas.style.transform = 'scale(0.5)';
    this.#canvas.style.opacity = '0';
    
    // Load new files
    await this.#loadFiles();
    
    // Animate in from zoomed out state
    requestAnimationFrame(() => {
      this.#canvas.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease';
      this.#canvas.style.transform = 'scale(1)';
      this.#canvas.style.opacity = '1';
    });
  }

  /**
   * Code file extensions that should open in Coder app
   */
  static #codeExtensions = new Set([
    // JavaScript/TypeScript
    'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx',
    // Web
    'html', 'htm', 'css', 'scss', 'sass', 'less',
    // Data/Config
    'json', 'yaml', 'yml', 'toml', 'xml', 'svg',
    // Languages
    'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp', 'cc',
    // Shell
    'sh', 'bash', 'zsh',
    // Database/Query
    'sql', 'graphql', 'gql',
  ]);

  /**
   * Check if a file should open in the code editor
   */
  #isCodeFile(path) {
    const ext = path.split('.').pop()?.toLowerCase();
    return ext && FilesApp.#codeExtensions.has(ext);
  }

  /**
   * Open a file in the appropriate editor
   */
  async #previewFile(path) {
    try {
      appContext.recordAction('files', 'open-file', { path });
      
      // Route to appropriate editor based on extension
      // Note: Files app stays open - editors open as overlays
      if (this.#isCodeFile(path)) {
        // Open in Coder app (Monaco)
        const coderApp = document.getElementById('coderApp');
        if (coderApp) {
          await coderApp.open(path);
        } else {
          console.warn('[FilesApp] Coder app not found, falling back to text editor');
          const textEditor = document.getElementById('textEditor');
          await textEditor?.open(path);
        }
      } else {
        // Open in Text editor (prose/markdown)
        const textEditor = document.getElementById('textEditor');
        if (textEditor) {
          await textEditor.open(path);
        } else {
          console.warn('[FilesApp] Text editor not found');
        }
      }
    } catch (err) {
      console.error('[FilesApp] Failed to open file:', err);
    }
  }

  /**
   * Update path breadcrumb
   */
  #updatePath() {
    if (!this.#pathElement) return;
    
    const segments = this.#currentPath.split('/').filter(Boolean);
    
    if (segments.length === 0) {
      this.#pathElement.innerHTML = '<span class="path-segment" data-path="/">/</span>';
    } else {
      const crumbs = ['<span class="path-segment" data-path="/">/</span>'];
      let buildPath = '';
      
      segments.forEach((seg, i) => {
        buildPath += '/' + seg;
        crumbs.push(`<span class="path-separator">/</span>`);
        crumbs.push(`<span class="path-segment" data-path="${buildPath}">${seg}</span>`);
      });
      
      this.#pathElement.innerHTML = crumbs.join('');
    }
    
    // Add click handlers to path segments
    this.#pathElement.querySelectorAll('.path-segment').forEach(seg => {
      seg.addEventListener('click', () => {
        const path = seg.dataset.path;
        if (path && path !== this.#currentPath) {
          this.navigateTo(path);
        }
      });
    });
  }

  /**
   * Show loading state
   */
  #showLoading() {
    if (!this.#canvas) return;
    this.#canvas.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
      </div>
    `;
  }

  /**
   * Handle touch start (pinch detection)
   */
  #handleTouchStart(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      this.#isPinching = true;
      this.#lastPinchDistance = this.#getTouchDistance(e.touches);
    }
  }

  /**
   * Handle touch move (pinch zoom)
   */
  #handleTouchMove(e) {
    if (!this.#isPinching || e.touches.length !== 2) return;
    
    e.preventDefault();
    
    const distance = this.#getTouchDistance(e.touches);
    const delta = (distance - this.#lastPinchDistance) * 0.005;
    
    this.#zoom = Math.max(this.#minZoom, Math.min(this.#maxZoom, this.#zoom + delta));
    this.#lastPinchDistance = distance;
    
    this.#applyZoom();
    this.#showZoomIndicator();
  }

  /**
   * Handle touch end
   */
  #handleTouchEnd() {
    this.#isPinching = false;
    this.#lastPinchDistance = 0;
  }

  /**
   * Get distance between two touch points
   */
  #getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Handle wheel/zoom
   */
  #handleWheel(e) {
    if (!e.ctrlKey && !e.metaKey) return;
    
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    this.#zoom = Math.max(this.#minZoom, Math.min(this.#maxZoom, this.#zoom + delta));
    
    this.#applyZoom();
    this.#showZoomIndicator();
  }

  /**
   * Apply zoom to canvas (and ensure visibility)
   */
  #applyZoom() {
    if (!this.#canvas) return;
    this.#canvas.style.transform = `scale(${this.#zoom})`;
    // Ensure canvas is visible after any zoom operations
    this.#canvas.style.opacity = '1';
  }

  /**
   * Show zoom indicator briefly
   */
  #showZoomIndicator() {
    if (!this.#zoomIndicator) return;
    
    this.#zoomIndicator.textContent = `${Math.round(this.#zoom * 100)}%`;
    this.#zoomIndicator.classList.add('visible');
    
    clearTimeout(this._zoomTimeout);
    this._zoomTimeout = setTimeout(() => {
      this.#zoomIndicator.classList.remove('visible');
    }, 1500);
  }

  /**
   * Handle keyboard events
   */
  #handleKeyDown(e) {
    if (e.key === 'Escape') {
      this.close();
    } else if (e.key === 'Backspace' && !e.target.matches('input, textarea')) {
      e.preventDefault();
      this.#navigateUp();
    }
  }

  /**
   * System folder names (predefined by the OS)
   * User-created folders will get the generic folder icon
   */
  static #systemFolders = new Set([
    'memories', 'notes', 'conversations', 'favorites',
    'projects', 'documents', 'music', 'pictures',
    'videos', 'recordings', 'downloads', 'uploads',
    'settings', 'temporary'
  ]);

  /**
   * Folder icon SVG - returns custom icon for system folders, generic for user folders
   */
  #folderIcon(name = '') {
    const folderName = name.toLowerCase();
    
    // Check if it's a system folder
    if (FilesApp.#systemFolders.has(folderName)) {
      return this.#getSystemFolderIcon(folderName);
    }
    
    // Generic folder icon for user-created folders
    return `<svg viewBox="0 0 24 24">
      <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" />
    </svg>`;
  }

  /**
   * Get custom icon for system folders
   */
  #getSystemFolderIcon(name) {
    const icons = {
      // Memories - heart with sparkle (Her-inspired, precious moments)
      memories: `<svg viewBox="0 0 24 24">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        <circle cx="17" cy="5" r="1.5" fill="currentColor" opacity="0.6"/>
        <circle cx="19" cy="7" r="1" fill="currentColor" opacity="0.4"/>
      </svg>`,

      // Notes - page with lines (quick thoughts)
      notes: `<svg viewBox="0 0 24 24">
        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
        <line x1="8" y1="16" x2="14" y2="16"/>
      </svg>`,

      // Conversations - chat bubbles (AI relationship)
      conversations: `<svg viewBox="0 0 24 24">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        <circle cx="9" cy="12" r="1" fill="currentColor"/>
        <circle cx="12" cy="12" r="1" fill="currentColor"/>
        <circle cx="15" cy="12" r="1" fill="currentColor"/>
      </svg>`,

      // Favorites - star (loved items)
      favorites: `<svg viewBox="0 0 24 24">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>`,

      // Projects - code brackets (development)
      projects: `<svg viewBox="0 0 24 24">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
        <line x1="12" y1="4" x2="12" y2="20" opacity="0.3"/>
      </svg>`,

      // Documents - stacked files (general docs)
      documents: `<svg viewBox="0 0 24 24">
        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>`,

      // Music - musical note (audio)
      music: `<svg viewBox="0 0 24 24">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>`,

      // Pictures - mountain landscape (images)
      pictures: `<svg viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>`,

      // Videos - play button in frame (video files)
      videos: `<svg viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <polygon points="10 8 16 11 10 14 10 8" fill="currentColor" opacity="0.6"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>`,

      // Recordings - microphone (voice memos)
      recordings: `<svg viewBox="0 0 24 24">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>`,

      // Downloads - arrow down into tray
      downloads: `<svg viewBox="0 0 24 24">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>`,

      // Uploads - arrow up from tray
      uploads: `<svg viewBox="0 0 24 24">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>`,

      // Settings - gear/cog (configuration)
      settings: `<svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>`,

      // Temporary - clock/timer (scratch files)
      temporary: `<svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>`
    };

    return icons[name] || this.#folderIcon();
  }

  /**
   * File icon SVG (based on extension)
   */
  #fileIcon(name) {
    const ext = name.split('.').pop()?.toLowerCase();
    
    // JSON/Config files
    if (ext === 'json' || ext === 'yaml' || ext === 'yml' || ext === 'toml') {
      return `<svg viewBox="0 0 24 24">
        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>`;
    }
    
    // Text/Markdown files
    if (ext === 'txt' || ext === 'md' || ext === 'markdown') {
      return `<svg viewBox="0 0 24 24">
        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="12" y2="17" />
      </svg>`;
    }
    
    // Default file icon
    return `<svg viewBox="0 0 24 24">
      <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>`;
  }

  /**
   * Get current path
   */
  get currentPath() {
    return this.#currentPath;
  }

  /**
   * Check if open
   */
  get isOpen() {
    return this.hasAttribute('open');
  }
}

customElements.define('files-app', FilesApp);
