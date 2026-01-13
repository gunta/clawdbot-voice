/**
 * Coder App Component
 * Monaco-powered code editor with Her aesthetic
 */
import { html } from 'htm/preact';
import { useSignal, useComputed, useSignalEffect } from '@preact/signals';
import { useRef, useEffect } from 'preact/hooks';
import { createShadowComponent } from '../shared/shadow-component.js';
import { ErrorBoundary } from '../shared/error-boundary.js';
import { navState, canGoBack, canGoForward, navigate } from '../../services/navigation-signals.js';
import { agentfs, systemSounds } from '../../services/index.js';

// Monaco CDN URL
const MONACO_CDN = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1';

/**
 * Load Monaco Editor from CDN
 */
async function loadMonaco() {
  if (window.__MONACO_INSTANCE__) return window.__MONACO_INSTANCE__;

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
      window.__MONACO_INSTANCE__ = window.monaco;
      defineCustomTheme();
      resolve(window.monaco);
    }, reject);
  });
}

/**
 * Define custom theme matching Her aesthetic
 */
function defineCustomTheme() {
  if (!window.monaco) return;

  window.monaco.editor.defineTheme('clawd-dark', {
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
 * Inject Monaco CSS into shadow DOM
 */
async function injectMonacoStyles(shadowRoot) {
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = `${MONACO_CDN}/min/vs/editor/editor.main.css`;
  shadowRoot.appendChild(styleLink);

  await new Promise((resolve) => {
    styleLink.onload = resolve;
    styleLink.onerror = resolve;
  });

  // Copy any inline Monaco styles
  const monacoStyles = document.querySelectorAll('style[data-name^="vs/"], link[href*="monaco"]');
  monacoStyles.forEach(style => {
    const clone = style.cloneNode(true);
    shadowRoot.appendChild(clone);
  });
}

/**
 * Get Monaco language from file path
 */
function getLanguageFromPath(path) {
  const ext = path?.split('.').pop()?.toLowerCase();

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
 * Get display name for language
 */
function getLanguageDisplayName(language) {
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

  return displayNames[language] || language;
}

function CoderApp({ host }) {
  // Refs
  const editorContainerRef = useRef(null);
  const editorWrapperRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const resizeObserverRef = useRef(null);

  // State signals
  const isOpen = useSignal(false);
  const filePath = useSignal(null);
  const fileName = useSignal('Untitled');
  const originalContent = useSignal('');
  const isDirty = useSignal(false);
  const isSaving = useSignal(false);
  const isLoading = useSignal(false);
  const statusMessage = useSignal('');
  const language = useSignal('plaintext');
  const cursorPosition = useSignal('Ln 1, Col 1');
  const isLocalFile = useSignal(false); // True if file is from /connections

  // Computed values
  const languageDisplayName = useComputed(() => getLanguageDisplayName(language.value));
  // canGoBack and canGoForward are imported from navigation-signals.js

  // Expose methods to host element
  host.open = async (path) => {
    systemSounds.open();
    const name = path ? path.split('/').pop() : 'Untitled';
    // Use navigation signals
    navigate.push('coder', name, { path });
  };

  host.close = () => {
    systemSounds.close();
    navigate.close();
  };

  host.save = () => saveFile();
  host.back = () => {
    systemSounds.back();
    navigate.back();
  };

  // Initialize Monaco editor
  useEffect(() => {
    let mounted = true;

    const initMonaco = async () => {
      if (!editorWrapperRef.current) return;

      try {
        isLoading.value = true;

        // Load Monaco and inject styles
        monacoRef.current = await loadMonaco();
        await injectMonacoStyles(host.shadowRoot);

        if (!mounted || !editorWrapperRef.current) return;

        // Create editor instance
        editorRef.current = monacoRef.current.editor.create(editorWrapperRef.current, {
          value: '',
          language: 'plaintext',
          theme: 'clawd-dark',
          automaticLayout: false,
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
        editorRef.current.onDidChangeModelContent(() => {
          if (!editorRef.current) return;
          const currentContent = editorRef.current.getValue();
          isDirty.value = currentContent !== originalContent.value;
        });

        // Listen for cursor position changes
        editorRef.current.onDidChangeCursorPosition((e) => {
          cursorPosition.value = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
        });

        // Set up ResizeObserver
        resizeObserverRef.current = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (editorRef.current) {
              const { width, height } = entry.contentRect;
              if (width > 0 && height > 0) {
                editorRef.current.layout({ width, height });
              }
            }
          }
        });
        resizeObserverRef.current.observe(editorContainerRef.current);

        isLoading.value = false;
      } catch (err) {
        console.error('[CoderApp] Failed to initialize Monaco:', err);
        statusMessage.value = 'Failed to load editor';
        isLoading.value = false;
      }
    };

    initMonaco();

    return () => {
      mounted = false;
      resizeObserverRef.current?.disconnect();
      editorRef.current?.dispose();
    };
  }, []);

  // Watch for navigation state changes
  useSignalEffect(() => {
    const state = navState.value;
    if (!state) return;

    const { current } = state.context || {};
    const isCoderActive = current?.id === 'coder';

    if (isCoderActive && !isOpen.value) {
      const path = current.state?.path;
      openFile(path);
    } else if (!isCoderActive && isOpen.value) {
      closeEditor();
    }
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen.value) return;

      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        host.close();
        return;
      }

      // Cmd/Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
        return;
      }

      // Cmd/Ctrl+W to close
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault();
        host.close();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Open file
  const openFile = async (path) => {
    filePath.value = path || null;
    fileName.value = path ? path.split('/').pop() : 'Untitled';
    isOpen.value = true;
    isLoading.value = true;
    
    // Check if this is a local file (from /connections)
    isLocalFile.value = path ? agentfs.isConnectionPath(path) : false;

    // Update language
    language.value = getLanguageFromPath(path);

    // Wait for visibility
    await waitForVisibility();

    try {
      if (!editorRef.current) {
        throw new Error('Editor not initialized');
      }

      // Layout editor
      if (editorContainerRef.current) {
        const rect = editorContainerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          editorRef.current.layout({ width: rect.width, height: rect.height });
        }
      }

      // Load file content
      if (path) {
        try {
          const content = await agentfs.readFile(path, 'utf-8');
          originalContent.value = content || '';
          editorRef.current.setValue(originalContent.value);
          isDirty.value = false;
        } catch (err) {
          console.error('[CoderApp] Failed to load file:', err);
          originalContent.value = '';
          editorRef.current.setValue('');
          statusMessage.value = 'Failed to load';
        }
      } else {
        originalContent.value = '';
        editorRef.current.setValue('');
        isDirty.value = false;
      }

      // Set language
      const model = editorRef.current.getModel();
      if (model && monacoRef.current) {
        monacoRef.current.editor.setModelLanguage(model, language.value);
      }

      editorRef.current.focus();
      isLoading.value = false;

      host.dispatchEvent(new CustomEvent('coder-open', {
        bubbles: true,
        detail: { path }
      }));
    } catch (err) {
      console.error('[CoderApp] Failed to open:', err);
      statusMessage.value = 'Failed to load';
      isLoading.value = false;
    }
  };

  // Close editor
  const closeEditor = () => {
    isOpen.value = false;
    filePath.value = null;
    fileName.value = 'Untitled';
    originalContent.value = '';
    isDirty.value = false;
    statusMessage.value = '';

    if (editorRef.current) {
      editorRef.current.setValue('');
    }

    host.dispatchEvent(new CustomEvent('coder-close', { bubbles: true }));
  };

  // Save file
  const saveFile = async () => {
    if (!filePath.value || isSaving.value || !editorRef.current) return;

    isSaving.value = true;
    statusMessage.value = 'Saving...';

    try {
      const content = editorRef.current.getValue();
      await agentfs.writeFile(filePath.value, content);

      originalContent.value = content;
      isDirty.value = false;

      systemSounds.success();
      statusMessage.value = isLocalFile.value ? 'Saved to computer' : 'Saved';
      setTimeout(() => { statusMessage.value = ''; }, 2000);

      host.dispatchEvent(new CustomEvent('coder-save', {
        bubbles: true,
        detail: { path: filePath.value }
      }));
    } catch (err) {
      console.error('[CoderApp] Save failed:', err);
      statusMessage.value = 'Save failed';
      systemSounds.error();
    } finally {
      isSaving.value = false;
    }
  };

  // Wait for visibility
  const waitForVisibility = () => {
    return new Promise((resolve) => {
      const checkVisibility = () => {
        if (!editorContainerRef.current) {
          requestAnimationFrame(checkVisibility);
          return;
        }

        const rect = editorContainerRef.current.getBoundingClientRect();
        if (rect && rect.width > 0 && rect.height > 0) {
          resolve();
        } else {
          requestAnimationFrame(checkVisibility);
        }
      };
      requestAnimationFrame(checkVisibility);
    });
  };

  // Handlers
  const handleBack = () => host.back();
  const handleForward = () => {
    navigate.forward();
  };
  const handleClose = () => host.close();
  const handleSave = () => saveFile();

  // Update host attribute
  useEffect(() => {
    if (isOpen.value) {
      host.setAttribute('open', '');
      if (isDirty.value) {
        host.setAttribute('dirty', '');
      } else {
        host.removeAttribute('dirty');
      }
    } else {
      host.removeAttribute('open');
      host.removeAttribute('dirty');
    }
  }, [isOpen.value, isDirty.value]);

  return html`
    <${ErrorBoundary} name="CoderApp">
      <div class="header">
        <div class="header-left">
          <button
            class="back-btn"
            type="button"
            aria-label="Go back"
            onClick=${handleBack}
            disabled=${!canGoBack.value}
            style=${{ display: canGoBack.value ? '' : 'none' }}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" />
            </svg>
          </button>
          <button
            class="forward-btn"
            type="button"
            aria-label="Go forward"
            onClick=${handleForward}
            disabled=${!canGoForward.value}
            style=${{ display: canGoForward.value ? '' : 'none' }}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M9 18L15 12L9 6" />
            </svg>
          </button>
        </div>
        <div class="title-area">
          <span class=${`title ${isDirty.value ? 'dirty' : ''}`}>
            ${fileName.value}
          </span>
          ${isLocalFile.value && html`<span class="local-badge">local</span>`}
          <span class="status">${statusMessage.value}</span>
        </div>
        <div class="header-right">
          <button
            class=${`save-btn ${isDirty.value ? 'dirty' : ''}`}
            type="button"
            aria-label="Save file"
            onClick=${handleSave}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <span>Save</span>
          </button>
          <button
            class="close-btn"
            type="button"
            aria-label="Close editor"
            onClick=${handleClose}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div class="editor-container" ref=${editorContainerRef}>
        <div class="editor-wrapper" ref=${editorWrapperRef}></div>
        <div class=${`loading-overlay ${isLoading.value ? 'visible' : ''}`}>
          <div class="loading-spinner"></div>
          <span class="loading-text">Loading editor...</span>
        </div>
      </div>

      <div class="footer">
        <span class="language-info">${languageDisplayName.value}</span>
        <span class="cursor-position">${cursorPosition.value}</span>
      </div>
    <//>
  `;
}

export default createShadowComponent(CoderApp, {
  tag: 'coder-app',
  styleUrl: new URL('./styles.css', import.meta.url).href,
});
