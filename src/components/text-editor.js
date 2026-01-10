/**
 * Text Editor Component - Preact Version
 * Native-feeling text editor for ClawdOS files
 * Uses Preact + HTM + Signals pattern
 */
import { html } from 'htm/preact';
import { useSignal, useComputed, useSignalEffect } from '@preact/signals';
import { useRef, useEffect } from 'preact/hooks';
import { createShadowComponent } from '../lib/shadow-component.js';
import { ErrorBoundary } from '../lib/error-boundary.js';
import { agentfs, systemSounds } from '../services/index.js';

const styles = `
  /* Critical inline styles to prevent FOUC */
  :host {
    position: fixed;
    inset: 0;
    z-index: 950;
    display: flex;
    flex-direction: column;
    background: var(--color-red, oklch(0.55 0.155 25));
    opacity: 0;
    visibility: hidden;
    transform: translateY(20px);
    transition: opacity 0.3s ease, visibility 0.3s ease, transform 0.3s ease;
    dynamic-range-limit: no-limit;
  }

  :host([open]) {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid oklch(1 0 0 / 0.12);
    flex-shrink: 0;
    background: oklch(0 0 0 / 0.15);
    -webkit-backdrop-filter: blur(20px);
    backdrop-filter: blur(20px);
  }

  .header-left,
  .header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 120px;
  }

  .header-left {
    justify-content: flex-start;
  }

  .header-right {
    justify-content: flex-end;
  }

  /* Back and Close buttons - elegant style */
  .back-btn,
  .close-btn {
    background: transparent;
    border: 1px solid oklch(1 0 0 / 0.35);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.15s ease;
    width: 2.25rem;
    height: 2.25rem;
  }

  .back-btn:hover,
  .close-btn:hover {
    border-color: oklch(1 0 0 / 0.7);
    background: oklch(1 0 0 / 0.1);
    transform: scale(1.02);
  }

  .back-btn:active,
  .close-btn:active {
    transform: scale(0.96);
    transition: transform 0.08s ease;
  }

  .back-btn svg,
  .close-btn svg {
    width: 1rem;
    height: 1rem;
    stroke: oklch(1 0 0 / 0.6);
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
    transition: stroke 0.15s ease;
  }

  .back-btn:hover svg,
  .close-btn:hover svg {
    stroke: oklch(1 0 0 / 0.95);
  }

  /* Title area */
  .title-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .title {
    font-family: var(--font-body, 'Cormorant Garamond', serif);
    font-size: 0.95rem;
    font-style: italic;
    font-weight: 400;
    color: oklch(1 0 0 / 0.85);
    letter-spacing: 0.06em;
  }

  .title.dirty::after {
    content: ' •';
    color: oklch(1 0 0 / 0.6);
  }

  .status {
    font-family: var(--font-body, 'Cormorant Garamond', serif);
    font-size: 0.7rem;
    font-style: italic;
    color: oklch(1 0 0 / 0.5);
    letter-spacing: 0.06em;
    min-height: 1em;
  }

  /* Save button - elegant pill style */
  .save-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid oklch(1 0 0 / 0.35);
    background: transparent;
    border-radius: var(--radius-lg, 30px);
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: var(--font-body, 'Cormorant Garamond', serif);
    font-size: 0.8rem;
    font-style: italic;
    color: oklch(1 0 0 / 0.6);
    letter-spacing: 0.08em;
  }

  .save-btn:hover {
    border-color: oklch(1 0 0 / 0.7);
    background: oklch(1 0 0 / 0.1);
    color: oklch(1 0 0 / 0.95);
    transform: scale(1.02);
  }

  .save-btn:active {
    transform: scale(0.96);
    transition: transform 0.08s ease;
  }

  :host([dirty]) .save-btn {
    border-color: oklch(1 0 0 / 0.7);
    color: oklch(1 0 0 / 0.95);
  }

  .save-btn svg {
    width: 0.9rem;
    height: 0.9rem;
    stroke: currentColor;
    stroke-width: 1.25;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  /* Editor Container */
  .editor-container {
    flex: 1;
    overflow: auto;
    padding: 2rem;
    background: oklch(0.12 0.01 25);
  }

  /* Editor */
  .editor {
    font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
    font-size: 0.9rem;
    line-height: 1.8;
    color: oklch(1 0 0 / 0.9);
    white-space: pre-wrap;
    word-wrap: break-word;
    outline: none;
    min-height: 100%;
    margin: 0;
    padding: 0;
    background: transparent;
    caret-color: oklch(1 0 0 / 0.85);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    tab-size: 2;
    -moz-tab-size: 2;
  }

  /* Placeholder */
  .editor:empty::before {
    content: attr(data-placeholder);
    color: oklch(1 0 0 / 0.25);
    font-family: var(--font-body, 'Cormorant Garamond', serif);
    font-style: italic;
    pointer-events: none;
  }

  /* Selection */
  .editor::selection {
    background: oklch(1 0 0 / 0.2);
  }

  .editor::-moz-selection {
    background: oklch(1 0 0 / 0.2);
  }

  /* Focus indicator - subtle */
  .editor:focus {
    animation: editor-focus 0.3s ease;
  }

  @keyframes editor-focus {
    from {
      box-shadow: inset 0 0 0 1px oklch(1 0 0 / 0.2);
    }
    to {
      box-shadow: inset 0 0 0 0 transparent;
    }
  }

  /* Footer */
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-top: 1px solid oklch(1 0 0 / 0.12);
    flex-shrink: 0;
    background: oklch(0 0 0 / 0.15);
  }

  .file-info,
  .cursor-position {
    font-family: var(--font-body, 'Cormorant Garamond', serif);
    font-size: 0.7rem;
    font-style: italic;
    color: oklch(1 0 0 / 0.4);
    letter-spacing: 0.06em;
  }

  /* Scrollbar */
  .editor-container::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .editor-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .editor-container::-webkit-scrollbar-thumb {
    background: oklch(1 0 0 / 0.15);
    border-radius: 3px;
  }

  .editor-container::-webkit-scrollbar-thumb:hover {
    background: oklch(1 0 0 / 0.25);
  }

  /* HDR Enhancement */
  @media (dynamic-range: high) {
    .back-btn:hover,
    .close-btn:hover,
    .save-btn:hover {
      border-color: var(--hdr-white-bright, oklch(1.15 0 0));
    }

    .title {
      color: var(--hdr-white-bright, oklch(1.15 0 0));
    }
  }

  /* Mobile adjustments */
  @media (max-width: 600px) {
    .header {
      padding: 1rem;
    }

    .editor-container {
      padding: 1.5rem;
    }

    .editor {
      font-size: 0.85rem;
      line-height: 1.7;
    }

    .save-btn span {
      display: none;
    }

    .save-btn {
      padding: 0.5rem;
      border-radius: 50%;
      width: 2.25rem;
      height: 2.25rem;
    }

    .footer {
      padding: 0.75rem 1rem;
    }
  }

  /* Safe area insets for iOS */
  @supports (padding: env(safe-area-inset-bottom)) {
    .footer {
      padding-bottom: calc(1rem + env(safe-area-inset-bottom));
    }
  }
`;

function TextEditor({ host }) {
  // State
  const content = useSignal('');
  const fileName = useSignal('Untitled');
  const filePath = useSignal(null);
  const originalContent = useSignal('');
  const isDirty = useComputed(() => content.value !== originalContent.value);
  const isSaving = useSignal(false);
  const status = useSignal('');
  const fileInfo = useSignal('');
  const cursorPosition = useSignal('Ln 1, Col 1');
  const isOpen = useSignal(false);

  // Refs
  const editorRef = useRef(null);

  /**
   * Open a file in the editor
   */
  host.open = async (path) => {
    filePath.value = path;
    isOpen.value = true;
    host.setAttribute('open', '');

    // Play open sound
    systemSounds.open();

    // Update title and file info
    const name = path.split('/').pop();
    fileName.value = name;
    updateFileInfo(path);

    // Load content
    await loadFile(path);

    // Focus editor
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        updateCursorPosition();
      }
    }, 100);

    // Dispatch event
    host.dispatchEvent(new CustomEvent('editor-open', {
      bubbles: true,
      detail: { path }
    }));
  };

  /**
   * Close the editor
   */
  host.close = () => {
    isOpen.value = false;
    host.removeAttribute('open');

    // Reset state
    filePath.value = null;
    originalContent.value = '';
    content.value = '';
    fileName.value = 'Untitled';

    // Play close sound
    systemSounds.close();

    // Dispatch event
    host.dispatchEvent(new CustomEvent('editor-close', { bubbles: true }));
  };

  /**
   * Go back to Files app
   */
  const handleBack = () => {
    // Close editor first
    isOpen.value = false;
    host.removeAttribute('open');

    // Get the directory of the current file
    const directory = filePath.value
      ? filePath.value.substring(0, filePath.value.lastIndexOf('/')) || '/'
      : '/';

    // Reset state
    const currentPath = filePath.value;
    filePath.value = null;
    originalContent.value = '';
    content.value = '';
    fileName.value = 'Untitled';

    // Play back sound
    systemSounds.back();

    // Open Files app at the directory
    const filesApp = document.getElementById('filesApp');
    if (filesApp) {
      filesApp.navigateTo(directory);
      filesApp.open();
    }

    // Dispatch event
    host.dispatchEvent(new CustomEvent('editor-back', { bubbles: true }));
  };

  /**
   * Save the file
   */
  const handleSave = async () => {
    if (!filePath.value || isSaving.value) return;

    isSaving.value = true;
    status.value = 'Saving...';

    try {
      await agentfs.writeFile(filePath.value, content.value);

      originalContent.value = content.value;

      // Play save sound
      systemSounds.success();

      status.value = 'Saved';
      setTimeout(() => { status.value = ''; }, 2000);

      // Dispatch event
      host.dispatchEvent(new CustomEvent('editor-save', {
        bubbles: true,
        detail: { path: filePath.value }
      }));
    } catch (err) {
      console.error('[TextEditor] Save failed:', err);
      status.value = 'Save failed';
      systemSounds.error();
    } finally {
      isSaving.value = false;
    }
  };

  /**
   * Load file content
   */
  const loadFile = async (path) => {
    if (!path) return;

    status.value = 'Loading...';

    try {
      const fileContent = await agentfs.readFile(path, 'utf-8');
      originalContent.value = fileContent || '';
      content.value = fileContent || '';
      status.value = '';
    } catch (err) {
      console.error('[TextEditor] Load failed:', err);
      content.value = '';
      status.value = 'Failed to load';
    }
  };

  /**
   * Handle editor input
   */
  const handleInput = (e) => {
    content.value = e.target.textContent || '';
  };

  /**
   * Update file info display
   */
  const updateFileInfo = (path) => {
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

    fileInfo.value = typeMap[ext] || ext?.toUpperCase() || 'Text';
  };

  /**
   * Update cursor position display
   */
  const updateCursorPosition = () => {
    if (!editorRef.current) return;

    const selection = host.shadowRoot.getSelection?.() || window.getSelection();
    if (!selection?.rangeCount) return;

    const range = selection.getRangeAt(0);

    // Get text before cursor
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const textBeforeCursor = preCaretRange.toString();

    // Calculate line and column
    const lines = textBeforeCursor.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;

    cursorPosition.value = `Ln ${line}, Col ${col}`;
  };

  /**
   * Handle keyboard events
   */
  const handleKeyDown = (e) => {
    // Escape to close
    if (e.key === 'Escape') {
      e.preventDefault();
      promptClose();
      return;
    }

    // Cmd/Ctrl+S to save
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
      return;
    }

    // Cmd/Ctrl+W to close
    if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
      e.preventDefault();
      promptClose();
      return;
    }
  };

  /**
   * Prompt before closing if dirty
   */
  const promptClose = () => {
    // For now, just close. Could add confirmation dialog later.
    host.close();
  };

  // Update dirty state attribute
  useSignalEffect(() => {
    if (isDirty.value) {
      host.setAttribute('dirty', '');
    } else {
      host.removeAttribute('dirty');
    }
  });

  // Add keyboard listener on mount
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return html`
    <${ErrorBoundary} name="TextEditor">
      <div class="header">
        <div class="header-left">
          <button
            class="back-btn"
            type="button"
            aria-label="Back to Files"
            onClick=${handleBack}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" />
            </svg>
          </button>
        </div>
        <div class="title-area">
          <span class="${'title' + (isDirty.value ? ' dirty' : '')}">${fileName.value}</span>
          <span class="status">${status.value}</span>
        </div>
        <div class="header-right">
          <button
            class="save-btn"
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
            onClick=${() => promptClose()}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div class="editor-container">
        <pre
          class="editor"
          ref=${editorRef}
          contenteditable="plaintext-only"
          spellcheck="false"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          data-placeholder="Start typing..."
          role="textbox"
          aria-multiline="true"
          aria-label="Text editor"
          onInput=${handleInput}
          onKeyUp=${updateCursorPosition}
          onClick=${updateCursorPosition}
        >${content.value}</pre>
      </div>

      <div class="footer">
        <span class="file-info">${fileInfo.value}</span>
        <span class="cursor-position">${cursorPosition.value}</span>
      </div>
    <//>
  `;
}

export default createShadowComponent(TextEditor, { tag: 'text-editor', styles });
