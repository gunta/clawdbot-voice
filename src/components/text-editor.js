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

export default createShadowComponent(TextEditor, {
  tag: 'text-editor',
  styleUrl: './src/components/styles/text-editor.css',
});
