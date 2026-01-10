/**
 * Coder App Component
 * Monaco-powered code editor with Her aesthetic
 * Uses Monaco Editor from CDN for syntax highlighting and code editing
 */

import { agentfs, systemSounds } from '../services/index.js';

// Monaco CDN URL
const MONACO_CDN = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1';

export class CoderApp extends HTMLElement {
  #editor = null;
  #monaco = null;
  #editorContainer = null;
  #backBtn = null;
  #closeBtn = null;
  #saveBtn = null;
  #titleElement = null;
  #statusElement = null;
  #languageElement = null;
  #positionElement = null;
  #boundHandleKeyDown = null;
  #resizeObserver = null;
  
  // State
  #filePath = null;
  #originalContent = '';
  #isDirty = false;
  #isSaving = false;
  #isLoading = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="src/components/styles/coder-app.css">
      
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
        <div class="editor-wrapper"></div>
        <div class="loading-overlay">
          <div class="loading-spinner"></div>
          <span class="loading-text">Loading editor...</span>
        </div>
      </div>
      
      <div class="footer">
        <span class="language-info">Plain Text</span>
        <span class="cursor-position">Ln 1, Col 1</span>
      </div>
    `;
  }

  connectedCallback() {
    this.#editorContainer = this.shadowRoot.querySelector('.editor-wrapper');
    this.#backBtn = this.shadowRoot.querySelector('.back-btn');
    this.#closeBtn = this.shadowRoot.querySelector('.close-btn');
    this.#saveBtn = this.shadowRoot.querySelector('.save-btn');
    this.#titleElement = this.shadowRoot.querySelector('.title');
    this.#statusElement = this.shadowRoot.querySelector('.status');
    this.#languageElement = this.shadowRoot.querySelector('.language-info');
    this.#positionElement = this.shadowRoot.querySelector('.cursor-position');
    
    // Event handlers
    this.#backBtn?.addEventListener('click', () => this.back());
    this.#closeBtn?.addEventListener('click', () => this.close());
    this.#saveBtn?.addEventListener('click', () => this.save());
    
    // Keyboard
    this.#boundHandleKeyDown = this.#handleKeyDown.bind(this);
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this.#boundHandleKeyDown);
    this.#resizeObserver?.disconnect();
    this.#editor?.dispose();
  }

  /**
   * Load Monaco Editor from CDN
   */
  async #loadMonaco() {
    if (this.#monaco) return this.#monaco;
    
    // Configure Monaco AMD loader
    if (!window.require) {
      await new Promise((resolve, reject) => {
        const loaderScript = document.createElement('script');
        loaderScript.src = `${MONACO_CDN}/min/vs/loader.js`;
        loaderScript.onload = resolve;
        loaderScript.onerror = reject;
        document.head.appendChild(loaderScript);
      });
    }
    
    // Configure require paths
    window.require.config({
      paths: { vs: `${MONACO_CDN}/min/vs` }
    });
    
    // Load Monaco
    return new Promise((resolve, reject) => {
      window.require(['vs/editor/editor.main'], () => {
        this.#monaco = window.monaco;
        this.#defineCustomTheme();
        resolve(this.#monaco);
      }, reject);
    });
  }

  /**
   * Define custom theme matching Her aesthetic
   */
  #defineCustomTheme() {
    if (!this.#monaco) return;
    
    this.#monaco.editor.defineTheme('clawd-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A6A6A', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'E8A87C' },
        { token: 'string', foreground: 'C9B1FF' },
        { token: 'number', foreground: 'FFD580' },
        { token: 'type', foreground: 'E8A87C' },
        { token: 'function', foreground: 'F0D9B5' },
        { token: 'variable', foreground: 'E0E0E0' },
        { token: 'constant', foreground: 'FFD580' },
        { token: 'operator', foreground: 'B0B0B0' },
      ],
      colors: {
        'editor.background': '#1A1210',
        'editor.foreground': '#E8E0DC',
        'editor.lineHighlightBackground': '#2A1F1C',
        'editor.selectionBackground': '#4A3530',
        'editor.inactiveSelectionBackground': '#3A2520',
        'editorCursor.foreground': '#E8A87C',
        'editorLineNumber.foreground': '#5A4A45',
        'editorLineNumber.activeForeground': '#A08A80',
        'editor.selectionHighlightBackground': '#3A2A25',
        'editorIndentGuide.background': '#2A201C',
        'editorIndentGuide.activeBackground': '#4A3A35',
        'scrollbarSlider.background': '#3A2A2580',
        'scrollbarSlider.hoverBackground': '#4A3A3580',
        'scrollbarSlider.activeBackground': '#5A4A4580',
        'editorWidget.background': '#1A1210',
        'editorWidget.border': '#3A2A25',
        'input.background': '#1A1210',
        'input.border': '#3A2A25',
        'input.foreground': '#E8E0DC',
        'dropdown.background': '#1A1210',
        'dropdown.border': '#3A2A25',
        'list.hoverBackground': '#2A1F1C',
        'list.activeSelectionBackground': '#4A3530',
        'minimap.background': '#1A1210',
      }
    });
  }

  /**
   * Create or get Monaco editor instance
   */
  async #getEditor() {
    if (this.#editor) return this.#editor;
    
    await this.#loadMonaco();
    
    // Get the parent container for dimensions (editor-container, not editor-wrapper)
    const editorContainer = this.shadowRoot.querySelector('.editor-container');
    
    // Monaco needs its CSS to work - copy styles into shadow DOM
    await this.#injectMonacoStyles();
    
    this.#editor = this.#monaco.editor.create(this.#editorContainer, {
      value: '',
      language: 'plaintext',
      theme: 'clawd-dark',
      automaticLayout: false, // We'll handle layout manually for Shadow DOM
      fontSize: 14,
      fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', monospace",
      lineHeight: 22,
      padding: { top: 16, bottom: 16 },
      minimap: { enabled: true, scale: 1 },
      scrollBeyondLastLine: false,
      renderLineHighlight: 'line',
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
      wordWrap: 'on',
      tabSize: 2,
      insertSpaces: true,
      folding: true,
      lineNumbers: 'on',
      glyphMargin: false,
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
      },
      scrollbar: {
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
      },
    });
    
    // Listen for content changes
    this.#editor.onDidChangeModelContent(() => {
      this.#handleContentChange();
    });
    
    // Listen for cursor position changes
    this.#editor.onDidChangeCursorPosition((e) => {
      this.#updateCursorPosition(e.position);
    });
    
    // Set up ResizeObserver on the parent container for proper Shadow DOM support
    this.#resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (this.#editor) {
          const { width, height } = entry.contentRect;
          // Only layout if we have valid dimensions
          if (width > 0 && height > 0) {
            this.#editor.layout({ width, height });
          }
        }
      }
    });
    this.#resizeObserver.observe(editorContainer);
    
    return this.#editor;
  }

  /**
   * Open a file in the editor
   * @param {string} [path] - File path (optional)
   */
  async open(path) {
    this.#filePath = path || null;
    this.setAttribute('open', '');
    document.addEventListener('keydown', this.#boundHandleKeyDown);
    
    // Show loading
    this.#showLoading(true);
    
    // Play open sound
    systemSounds.open();
    
    // Update title
    const fileName = path ? path.split('/').pop() : 'Untitled';
    this.#titleElement.textContent = fileName;
    
    // Detect language from extension
    const language = path ? this.#getLanguageFromPath(path) : 'plaintext';
    this.#updateLanguageInfo(language);
    
    // Wait for element to be visible before initializing Monaco
    // This ensures the container has proper dimensions
    await this.#waitForVisibility();
    
    try {
      // Ensure editor is created (now that container is visible)
      const editor = await this.#getEditor();
      
      // Force initial layout with explicit dimensions
      const editorContainer = this.shadowRoot.querySelector('.editor-container');
      const rect = editorContainer.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        editor.layout({ width: rect.width, height: rect.height });
      }
      
      // Load content (only if path provided)
      if (path) {
        await this.#loadFile();
      }
      
      // Set language
      const model = editor.getModel();
      if (model && this.#monaco) {
        this.#monaco.editor.setModelLanguage(model, language);
      }
      
      editor.focus();
      this.#showLoading(false);
    } catch (err) {
      console.error('[CoderApp] Failed to open:', err);
      this.#setStatus('Failed to load');
      this.#showLoading(false);
    }
    
    this.dispatchEvent(new CustomEvent('coder-open', { 
      bubbles: true, 
      detail: { path } 
    }));
  }
  
  /**
   * Inject Monaco CSS into shadow DOM
   * Monaco injects styles into document.head, but we need them in shadow DOM
   */
  async #injectMonacoStyles() {
    // Find Monaco styles in document head
    const monacoStyles = document.querySelectorAll('style[data-name^="vs/"], link[href*="monaco"]');
    
    // Also inject from CDN directly
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = `${MONACO_CDN}/min/vs/editor/editor.main.css`;
    this.shadowRoot.appendChild(styleLink);
    
    // Wait for stylesheet to load
    await new Promise((resolve) => {
      styleLink.onload = resolve;
      styleLink.onerror = resolve; // Continue even if it fails
    });
    
    // Copy any inline Monaco styles
    monacoStyles.forEach(style => {
      const clone = style.cloneNode(true);
      this.shadowRoot.appendChild(clone);
    });
  }

  /**
   * Wait for the component to be visible with proper dimensions
   */
  #waitForVisibility() {
    return new Promise((resolve) => {
      const checkVisibility = () => {
        const container = this.shadowRoot.querySelector('.editor-container');
        const rect = container?.getBoundingClientRect();
        if (rect && rect.width > 0 && rect.height > 0) {
          resolve();
        } else {
          requestAnimationFrame(checkVisibility);
        }
      };
      // Start checking on next frame after 'open' attribute is set
      requestAnimationFrame(checkVisibility);
    });
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
      this.#editor.setValue('');
    }
    
    // Play close sound
    systemSounds.close();
    
    this.dispatchEvent(new CustomEvent('coder-close', { bubbles: true }));
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
      this.#editor.setValue('');
    }
    
    // Play back sound
    systemSounds.back();
    
    // Open Files app at the directory
    const filesApp = document.getElementById('filesApp');
    if (filesApp) {
      filesApp.navigateTo(directory);
      filesApp.open();
    }
    
    this.dispatchEvent(new CustomEvent('coder-back', { bubbles: true }));
  }

  /**
   * Save the file
   */
  async save() {
    if (!this.#filePath || this.#isSaving || !this.#editor) return;
    
    this.#isSaving = true;
    this.#setStatus('Saving...');
    
    try {
      const content = this.#editor.getValue();
      await agentfs.writeFile(this.#filePath, content);
      
      this.#originalContent = content;
      this.#isDirty = false;
      this.#updateDirtyState();
      
      // Play save sound
      systemSounds.success();
      
      this.#setStatus('Saved');
      setTimeout(() => this.#setStatus(''), 2000);
      
      this.dispatchEvent(new CustomEvent('coder-save', { 
        bubbles: true, 
        detail: { path: this.#filePath } 
      }));
    } catch (err) {
      console.error('[CoderApp] Save failed:', err);
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
      this.#editor.setValue(this.#originalContent);
      this.#isDirty = false;
      this.#updateDirtyState();
      this.#setStatus('');
    } catch (err) {
      console.error('[CoderApp] Load failed:', err);
      this.#editor.setValue('');
      this.#setStatus('Failed to load');
    }
  }

  /**
   * Handle content change
   */
  #handleContentChange() {
    if (!this.#editor) return;
    
    const currentContent = this.#editor.getValue();
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
  #updateCursorPosition(position) {
    if (!this.#positionElement || !position) return;
    this.#positionElement.textContent = `Ln ${position.lineNumber}, Col ${position.column}`;
  }

  /**
   * Update language info display
   */
  #updateLanguageInfo(language) {
    if (!this.#languageElement) return;
    
    const displayNames = {
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'json': 'JSON',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'less': 'Less',
      'markdown': 'Markdown',
      'python': 'Python',
      'yaml': 'YAML',
      'xml': 'XML',
      'shell': 'Shell',
      'sql': 'SQL',
      'graphql': 'GraphQL',
      'rust': 'Rust',
      'go': 'Go',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'ruby': 'Ruby',
      'plaintext': 'Plain Text',
    };
    
    this.#languageElement.textContent = displayNames[language] || language;
  }

  /**
   * Get Monaco language from file path
   */
  #getLanguageFromPath(path) {
    const ext = path.split('.').pop()?.toLowerCase();
    
    const languageMap = {
      'js': 'javascript',
      'mjs': 'javascript',
      'cjs': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'json': 'json',
      'html': 'html',
      'htm': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'scss',
      'less': 'less',
      'md': 'markdown',
      'markdown': 'markdown',
      'py': 'python',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'ini',
      'xml': 'xml',
      'svg': 'xml',
      'sh': 'shell',
      'bash': 'shell',
      'zsh': 'shell',
      'sql': 'sql',
      'graphql': 'graphql',
      'gql': 'graphql',
      'rs': 'rust',
      'go': 'go',
      'java': 'java',
      'c': 'c',
      'h': 'c',
      'cpp': 'cpp',
      'hpp': 'cpp',
      'cc': 'cpp',
      'rb': 'ruby',
      'txt': 'plaintext',
    };
    
    return languageMap[ext] || 'plaintext';
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
   * Show/hide loading overlay
   */
  #showLoading(show) {
    const overlay = this.shadowRoot.querySelector('.loading-overlay');
    if (overlay) {
      overlay.classList.toggle('visible', show);
    }
  }

  /**
   * Handle keyboard events
   */
  #handleKeyDown(e) {
    // Escape to close
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
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
      this.close();
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
   * Get current working directory (directory of current file)
   * Used by drop-zone for determining upload destination
   */
  get currentWorkingDirectory() {
    if (!this.#filePath) return '/projects';
    return this.#filePath.substring(0, this.#filePath.lastIndexOf('/')) || '/projects';
  }

  /**
   * Check if file has unsaved changes
   */
  get isDirty() {
    return this.#isDirty;
  }
}

customElements.define('coder-app', CoderApp);
