/**
 * Text Editor Component
 * Native-feeling text editor for ClawdOS files
 * Uses contenteditable with modern HTML attributes
 */

import { agentfs, systemSounds } from '../services/index.js';

export class TextEditor extends HTMLElement {
  #editor = null;
  #backBtn = null;
  #closeBtn = null;
  #saveBtn = null;
  #titleElement = null;
  #statusElement = null;
  #boundHandleKeyDown = null;
  
  // State
  #filePath = null;
  #originalContent = '';
  #isDirty = false;
  #isSaving = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        /* Critical inline styles to prevent FOUC */
        :host {
          position: fixed;
          inset: 0;
          opacity: 0;
          visibility: hidden;
        }
      </style>
      <link rel="stylesheet" href="src/components/styles/text-editor.css">
      
      <div class="header">
        <div class="header-left">
          <button class="back-btn" type="button" aria-label="Back to Files">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" />
            </svg>
          </button>
        </div>
        <div class="title-area">
          <span class="title">Untitled</span>
          <span class="status"></span>
        </div>
        <div class="header-right">
          <button class="save-btn" type="button" aria-label="Save file">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <span>Save</span>
          </button>
          <button class="close-btn" type="button" aria-label="Close editor">
            <svg viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      
      <div class="editor-container">
        <pre class="editor" 
             contenteditable="plaintext-only"
             spellcheck="false"
             autocomplete="off"
             autocorrect="off"
             autocapitalize="off"
             data-placeholder="Start typing..."
             role="textbox"
             aria-multiline="true"
             aria-label="Text editor"></pre>
      </div>
      
      <div class="footer">
        <span class="file-info"></span>
        <span class="cursor-position">Ln 1, Col 1</span>
      </div>
    `;
  }

  connectedCallback() {
    this.#editor = this.shadowRoot.querySelector('.editor');
    this.#backBtn = this.shadowRoot.querySelector('.back-btn');
    this.#closeBtn = this.shadowRoot.querySelector('.close-btn');
    this.#saveBtn = this.shadowRoot.querySelector('.save-btn');
    this.#titleElement = this.shadowRoot.querySelector('.title');
    this.#statusElement = this.shadowRoot.querySelector('.status');
    
    // Event handlers
    this.#backBtn?.addEventListener('click', () => this.back());
    this.#closeBtn?.addEventListener('click', () => this.close());
    this.#saveBtn?.addEventListener('click', () => this.save());
    
    // Editor events
    this.#editor?.addEventListener('input', () => this.#handleInput());
    this.#editor?.addEventListener('keyup', () => this.#updateCursorPosition());
    this.#editor?.addEventListener('click', () => this.#updateCursorPosition());
    
    // Keyboard
    this.#boundHandleKeyDown = this.#handleKeyDown.bind(this);
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this.#boundHandleKeyDown);
  }

  /**
   * Open a file in the editor
   * @param {string} path - File path
   */
  async open(path) {
    this.#filePath = path;
    this.setAttribute('open', '');
    document.addEventListener('keydown', this.#boundHandleKeyDown);
    
    // Play open sound
    systemSounds.open();
    
    // Update title
    const fileName = path.split('/').pop();
    this.#titleElement.textContent = fileName;
    this.#updateFileInfo(path);
    
    // Load content
    await this.#loadFile();
    
    // Focus editor
    setTimeout(() => {
      this.#editor?.focus();
      this.#updateCursorPosition();
    }, 100);
    
    this.dispatchEvent(new CustomEvent('editor-open', { 
      bubbles: true, 
      detail: { path } 
    }));
  }

  /**
   * Close the editor
   */
  close() {
    this.removeAttribute('open');
    document.removeEventListener('keydown', this.#boundHandleKeyDown);
    
    // Reset state
    this.#filePath = null;
    this.#originalContent = '';
    this.#isDirty = false;
    if (this.#editor) {
      this.#editor.textContent = '';
    }
    
    // Play close sound
    systemSounds.close();
    
    this.dispatchEvent(new CustomEvent('editor-close', { bubbles: true }));
  }

  /**
   * Go back to Files app
   */
  back() {
    // Close editor first
    this.removeAttribute('open');
    document.removeEventListener('keydown', this.#boundHandleKeyDown);
    
    // Get the directory of the current file
    const directory = this.#filePath 
      ? this.#filePath.substring(0, this.#filePath.lastIndexOf('/')) || '/'
      : '/';
    
    // Reset state
    this.#filePath = null;
    this.#originalContent = '';
    this.#isDirty = false;
    if (this.#editor) {
      this.#editor.textContent = '';
    }
    
    // Play back sound
    systemSounds.back();
    
    // Open Files app at the directory
    const filesApp = document.getElementById('filesApp');
    if (filesApp) {
      filesApp.navigateTo(directory);
      filesApp.open();
    }
    
    this.dispatchEvent(new CustomEvent('editor-back', { bubbles: true }));
  }

  /**
   * Save the file
   */
  async save() {
    if (!this.#filePath || this.#isSaving) return;
    
    this.#isSaving = true;
    this.#setStatus('Saving...');
    
    try {
      const content = this.#editor?.textContent || '';
      await agentfs.writeFile(this.#filePath, content);
      
      this.#originalContent = content;
      this.#isDirty = false;
      this.#updateDirtyState();
      
      // Play save sound
      systemSounds.success();
      
      this.#setStatus('Saved');
      setTimeout(() => this.#setStatus(''), 2000);
      
      this.dispatchEvent(new CustomEvent('editor-save', { 
        bubbles: true, 
        detail: { path: this.#filePath } 
      }));
    } catch (err) {
      console.error('[TextEditor] Save failed:', err);
      this.#setStatus('Save failed');
      systemSounds.error();
    } finally {
      this.#isSaving = false;
    }
  }

  /**
   * Load file content
   */
  async #loadFile() {
    if (!this.#filePath || !this.#editor) return;
    
    this.#setStatus('Loading...');
    
    try {
      const content = await agentfs.readFile(this.#filePath, 'utf-8');
      this.#originalContent = content || '';
      this.#editor.textContent = this.#originalContent;
      this.#isDirty = false;
      this.#updateDirtyState();
      this.#setStatus('');
    } catch (err) {
      console.error('[TextEditor] Load failed:', err);
      this.#editor.textContent = '';
      this.#setStatus('Failed to load');
    }
  }

  /**
   * Handle editor input
   */
  #handleInput() {
    const currentContent = this.#editor?.textContent || '';
    const wasDirty = this.#isDirty;
    this.#isDirty = currentContent !== this.#originalContent;
    
    if (wasDirty !== this.#isDirty) {
      this.#updateDirtyState();
    }
  }

  /**
   * Update dirty (unsaved) state UI
   */
  #updateDirtyState() {
    if (this.#isDirty) {
      this.setAttribute('dirty', '');
      this.#titleElement.classList.add('dirty');
    } else {
      this.removeAttribute('dirty');
      this.#titleElement.classList.remove('dirty');
    }
  }

  /**
   * Update cursor position display
   */
  #updateCursorPosition() {
    const positionEl = this.shadowRoot.querySelector('.cursor-position');
    if (!positionEl || !this.#editor) return;
    
    const selection = this.shadowRoot.getSelection?.() || window.getSelection();
    if (!selection?.rangeCount) return;
    
    const content = this.#editor.textContent || '';
    const range = selection.getRangeAt(0);
    
    // Get text before cursor
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(this.#editor);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const textBeforeCursor = preCaretRange.toString();
    
    // Calculate line and column
    const lines = textBeforeCursor.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    
    positionEl.textContent = `Ln ${line}, Col ${col}`;
  }

  /**
   * Update file info display
   */
  #updateFileInfo(path) {
    const infoEl = this.shadowRoot.querySelector('.file-info');
    if (!infoEl) return;
    
    const ext = path.split('.').pop()?.toLowerCase();
    const typeMap = {
      'json': 'JSON',
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'css': 'CSS',
      'html': 'HTML',
      'md': 'Markdown',
      'txt': 'Plain Text',
      'yaml': 'YAML',
      'yml': 'YAML'
    };
    
    infoEl.textContent = typeMap[ext] || ext?.toUpperCase() || 'Text';
  }

  /**
   * Set status message
   */
  #setStatus(message) {
    if (this.#statusElement) {
      this.#statusElement.textContent = message;
    }
  }

  /**
   * Prompt before closing if dirty
   */
  #promptClose() {
    if (this.#isDirty) {
      // For now, just close. Could add confirmation dialog later.
      this.close();
    } else {
      this.close();
    }
  }

  /**
   * Handle keyboard events
   */
  #handleKeyDown(e) {
    // Escape to close
    if (e.key === 'Escape') {
      e.preventDefault();
      this.#promptClose();
      return;
    }
    
    // Cmd/Ctrl+S to save
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      this.save();
      return;
    }
    
    // Cmd/Ctrl+W to close
    if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
      e.preventDefault();
      this.#promptClose();
      return;
    }
  }

  /**
   * Check if editor is open
   */
  get isOpen() {
    return this.hasAttribute('open');
  }

  /**
   * Get current file path
   */
  get filePath() {
    return this.#filePath;
  }

  /**
   * Check if file has unsaved changes
   */
  get isDirty() {
    return this.#isDirty;
  }
}

customElements.define('text-editor', TextEditor);
