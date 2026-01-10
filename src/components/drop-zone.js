/**
 * Drop Zone Component
 * Beautiful drag & drop overlay for file uploads
 * Integrates with app context to upload to current working directory
 */

import { agentfs, systemSounds } from '../services/index.js';

export class DropZone extends HTMLElement {
  #dropOverlay = null;
  #dropIcon = null;
  #dropText = null;
  #dropSubtext = null;
  #progressBar = null;
  #progressFill = null;
  
  // State
  #isActive = false;
  #targetPath = '/uploads';
  #targetApp = null;
  #uploadQueue = [];
  #isUploading = false;
  
  // Drag counter for nested elements
  #dragCounter = 0;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="src/components/styles/drop-zone.css">
      
      <div class="overlay">
        <div class="drop-area">
          <div class="ripple-container">
            <div class="ripple"></div>
            <div class="ripple delay-1"></div>
            <div class="ripple delay-2"></div>
          </div>
          
          <div class="icon">
            <svg viewBox="0 0 64 64" fill="none">
              <path class="arrow" d="M32 48V16M32 16L20 28M32 16L44 28" />
              <path class="cloud" d="M14 40C9 40 5 36 5 31C5 26.5 8.2 22.8 12.5 22.1C13 17 17 13 22 13C25.5 13 28.5 15 30.2 18C31.4 17.4 32.7 17 34 17C39 17 43.2 20.6 44 25.3C44.3 25.3 44.7 25.2 45 25.2C51 25.2 56 30.2 56 36.2C56 41.5 52 45.8 47 46.5" />
              <rect class="tray" x="16" y="50" width="32" height="4" rx="2" />
            </svg>
          </div>
          
          <span class="text">drop files here</span>
          <span class="subtext">uploading to /uploads</span>
          
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
          
          <div class="file-preview"></div>
        </div>
      </div>
    `;
  }

  connectedCallback() {
    this.#dropOverlay = this.shadowRoot.querySelector('.overlay');
    this.#dropIcon = this.shadowRoot.querySelector('.icon');
    this.#dropText = this.shadowRoot.querySelector('.text');
    this.#dropSubtext = this.shadowRoot.querySelector('.subtext');
    this.#progressBar = this.shadowRoot.querySelector('.progress-bar');
    this.#progressFill = this.shadowRoot.querySelector('.progress-fill');
    
    // Global drag events on document
    this.#setupGlobalDragEvents();
  }

  disconnectedCallback() {
    this.#removeGlobalDragEvents();
  }

  /**
   * Set up global drag & drop event listeners
   */
  #setupGlobalDragEvents() {
    // Use document.body to capture all drag events
    document.addEventListener('dragenter', this.#handleDragEnter.bind(this));
    document.addEventListener('dragleave', this.#handleDragLeave.bind(this));
    document.addEventListener('dragover', this.#handleDragOver.bind(this));
    document.addEventListener('drop', this.#handleDrop.bind(this));
  }

  #removeGlobalDragEvents() {
    document.removeEventListener('dragenter', this.#handleDragEnter.bind(this));
    document.removeEventListener('dragleave', this.#handleDragLeave.bind(this));
    document.removeEventListener('dragover', this.#handleDragOver.bind(this));
    document.removeEventListener('drop', this.#handleDrop.bind(this));
  }

  /**
   * Handle drag enter - show overlay
   */
  #handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Only activate for file transfers
    if (!this.#hasFiles(e)) return;
    
    this.#dragCounter++;
    
    if (this.#dragCounter === 1) {
      this.#show();
    }
  }

  /**
   * Handle drag leave - hide overlay when leaving window
   */
  #handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    
    this.#dragCounter--;
    
    if (this.#dragCounter === 0) {
      this.#hide();
    }
  }

  /**
   * Handle drag over - allow drop
   */
  #handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Update target based on current app context
    this.#updateTargetPath();
    
    // Set drop effect
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  /**
   * Handle drop - upload files
   */
  async #handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    this.#dragCounter = 0;
    
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) {
      this.#hide();
      return;
    }
    
    // Play drop sound
    systemSounds.success();
    
    // Show uploading state
    this.#showUploading(files);
    
    // Process files
    await this.#uploadFiles(Array.from(files));
    
    // Hide after short delay
    setTimeout(() => this.#hide(), 1500);
  }

  /**
   * Check if drag event contains files
   */
  #hasFiles(e) {
    if (e.dataTransfer?.types) {
      for (const type of e.dataTransfer.types) {
        if (type === 'Files') return true;
      }
    }
    return false;
  }

  /**
   * Update target path based on active app
   */
  #updateTargetPath() {
    // Check which app is open and get its current working directory
    const filesApp = document.getElementById('filesApp');
    const commandsApp = document.getElementById('commandsApp');
    const coderApp = document.getElementById('coderApp');
    
    if (coderApp?.hasAttribute('open')) {
      // Coder app - upload to directory of current file
      this.#targetApp = 'coder';
      const filePath = coderApp.filePath;
      if (filePath) {
        this.#targetPath = filePath.substring(0, filePath.lastIndexOf('/')) || '/projects';
      } else {
        this.#targetPath = '/projects';
      }
    } else if (commandsApp?.hasAttribute('open')) {
      // Commands app - use terminal's current working directory
      this.#targetApp = 'commands';
      this.#targetPath = commandsApp.currentWorkingDirectory || '/projects';
    } else if (filesApp?.hasAttribute('open')) {
      // Files app - use current path
      this.#targetApp = 'files';
      this.#targetPath = filesApp.currentPath || '/';
    } else {
      // No app open - default to uploads
      this.#targetApp = null;
      this.#targetPath = '/uploads';
    }
    
    // Update subtext
    if (this.#dropSubtext) {
      this.#dropSubtext.textContent = `uploading to ${this.#targetPath}`;
    }
  }

  /**
   * Show the drop overlay
   */
  #show() {
    if (this.#isActive) return;
    this.#isActive = true;
    
    this.#updateTargetPath();
    
    this.setAttribute('active', '');
    this.#dropOverlay?.classList.add('visible');
    
    // Play subtle open sound
    systemSounds.open();
  }

  /**
   * Hide the drop overlay
   */
  #hide() {
    if (!this.#isActive) return;
    this.#isActive = false;
    
    this.removeAttribute('active');
    this.#dropOverlay?.classList.remove('visible');
    this.#dropOverlay?.classList.remove('uploading');
    this.#dropOverlay?.classList.remove('success');
    
    // Reset progress
    if (this.#progressFill) {
      this.#progressFill.style.width = '0%';
    }
  }

  /**
   * Show uploading state
   */
  #showUploading(files) {
    this.#dropOverlay?.classList.add('uploading');
    
    if (this.#dropText) {
      this.#dropText.textContent = files.length === 1 
        ? `uploading ${files[0].name}` 
        : `uploading ${files.length} files`;
    }
    
    if (this.#dropSubtext) {
      this.#dropSubtext.textContent = `to ${this.#targetPath}`;
    }
  }

  /**
   * Upload files to AgentFS
   */
  async #uploadFiles(files) {
    const total = files.length;
    let completed = 0;
    
    // Initialize AgentFS
    await agentfs.init();
    
    for (const file of files) {
      try {
        // Read file as ArrayBuffer for binary files, text for text files
        const content = await this.#readFile(file);
        
        // Debug: log what we're writing
        console.log('[DropZone] Content type:', typeof content, content?.constructor?.name);
        console.log('[DropZone] Content size:', content?.length || content?.byteLength);
        
        // Construct full path
        const fullPath = this.#targetPath === '/' 
          ? `/${file.name}` 
          : `${this.#targetPath}/${file.name}`;
        
        // For binary files, convert ArrayBuffer to Uint8Array for better compatibility
        const dataToWrite = content instanceof ArrayBuffer 
          ? new Uint8Array(content)
          : content;
        
        console.log('[DropZone] Writing as:', dataToWrite?.constructor?.name);
        
        // Write to AgentFS
        await agentfs.writeFile(fullPath, dataToWrite);
        
        console.log('[DropZone] Uploaded:', fullPath);
        
        completed++;
        this.#updateProgress(completed / total);
        
      } catch (err) {
        console.error('[DropZone] Upload failed:', file.name, err);
      }
    }
    
    // Show success
    this.#showSuccess(completed, total);
    
    // Refresh files app if open
    this.#refreshCurrentApp();
  }

  /**
   * Read file contents
   */
  async #readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      // For text files, read as text; for binary, read as ArrayBuffer
      const isText = this.#isTextFile(file.name);
      
      reader.onload = () => {
        resolve(reader.result);
      };
      
      reader.onerror = reject;
      
      if (isText) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  }

  /**
   * Check if file is text-based
   */
  #isTextFile(name) {
    const textExtensions = new Set([
      'txt', 'md', 'markdown', 'json', 'yaml', 'yml', 'toml', 'xml',
      'html', 'htm', 'css', 'scss', 'sass', 'less',
      'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx',
      'py', 'rb', 'php', 'java', 'c', 'cpp', 'h', 'hpp', 'go', 'rs',
      'sh', 'bash', 'zsh', 'sql', 'graphql', 'gql',
      'svg', 'env', 'gitignore', 'dockerignore',
    ]);
    
    const ext = name.split('.').pop()?.toLowerCase();
    return ext && textExtensions.has(ext);
  }

  /**
   * Update progress bar
   */
  #updateProgress(percent) {
    if (this.#progressFill) {
      this.#progressFill.style.width = `${percent * 100}%`;
    }
  }

  /**
   * Show success state
   */
  #showSuccess(completed, total) {
    this.#dropOverlay?.classList.remove('uploading');
    this.#dropOverlay?.classList.add('success');
    
    if (this.#dropText) {
      this.#dropText.textContent = completed === total 
        ? `uploaded ${completed} file${completed === 1 ? '' : 's'}` 
        : `uploaded ${completed} of ${total} files`;
    }
    
    systemSounds.success();
  }

  /**
   * Refresh the current app to show new files
   */
  #refreshCurrentApp() {
    const filesApp = document.getElementById('filesApp');
    
    if (filesApp?.hasAttribute('open')) {
      // Refresh files app
      filesApp.navigateTo?.(filesApp.currentPath || '/');
    }
    
    // Dispatch event for other listeners
    this.dispatchEvent(new CustomEvent('files-uploaded', {
      bubbles: true,
      detail: {
        path: this.#targetPath,
        app: this.#targetApp
      }
    }));
  }
}

customElements.define('drop-zone', DropZone);
