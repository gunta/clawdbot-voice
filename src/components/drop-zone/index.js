/**
 * Drop Zone Component
 * Beautiful drag & drop overlay for file uploads
 * Supports:
 * - Copy into files (AgentFS or /connections destination)
 * - Open to edit (via file handles for direct-to-disk editing)
 * - Connect folder (creates a mount under /connections)
 * 
 * Migrated to Preact + HTM + Signals
 */

import { html } from 'htm/preact';
import { useSignal, useComputed } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { createShadowComponent } from '../shared/shadow-component.js';
import { ErrorBoundary } from '../shared/error-boundary.js';
import { agentfs, systemSounds } from '../../services/index.js';

// Text/code file extensions for smart defaults
const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'json', 'yaml', 'yml', 'toml', 'xml',
  'html', 'htm', 'css', 'scss', 'sass', 'less',
  'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx',
  'py', 'rb', 'php', 'java', 'c', 'cpp', 'h', 'hpp', 'go', 'rs',
  'sh', 'bash', 'zsh', 'sql', 'graphql', 'gql',
  'svg', 'env', 'gitignore', 'dockerignore',
]);

function isTextFile(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  return ext && TEXT_EXTENSIONS.has(ext);
}

function DropZone({ host }) {
  // State signals
  const isVisible = useSignal(false);
  const isUploading = useSignal(false);
  const isSuccess = useSignal(false);
  const dragCounter = useSignal(0);
  const progress = useSignal(0);
  const statusText = useSignal('drop files here');
  const statusSubtext = useSignal('uploading to /uploads');
  const targetPath = useSignal('/uploads');
  const targetApp = useSignal(null);
  
  // Prompt state
  const showPrompt = useSignal(false);
  const promptOptions = useSignal([]);
  const defaultOption = useSignal('copy');
  const droppedItems = useSignal([]);
  const droppedHandles = useSignal([]);
  
  // Refs
  const promptResolveRef = useRef(null);

  // Feature detection
  const supportsHandles = agentfs.supportsHandleFromDrop?.() ?? false;
  const supportsConnections = agentfs.isConnectionsSupported?.() ?? false;

  // Helpers
  const hasFiles = (e) => {
    if (e.dataTransfer?.types) {
      for (const type of e.dataTransfer.types) {
        if (type === 'Files') return true;
      }
    }
    return false;
  };

  const updateTargetPath = () => {
    const filesApp = document.getElementById('filesApp');
    const commandsApp = document.getElementById('commandsApp');
    const coderApp = document.getElementById('coderApp');

    if (coderApp?.hasAttribute('open')) {
      targetApp.value = 'coder';
      const filePath = coderApp.filePath;
      if (filePath) {
        targetPath.value = filePath.substring(0, filePath.lastIndexOf('/')) || '/projects';
      } else {
        targetPath.value = '/projects';
      }
    } else if (commandsApp?.hasAttribute('open')) {
      targetApp.value = 'commands';
      targetPath.value = commandsApp.currentWorkingDirectory || '/projects';
    } else if (filesApp?.hasAttribute('open')) {
      targetApp.value = 'files';
      targetPath.value = filesApp.currentPath || '/';
    } else {
      targetApp.value = null;
      targetPath.value = '/uploads';
    }

    statusSubtext.value = `uploading to ${targetPath.value}`;
  };

  const show = () => {
    if (isVisible.value) return;
    isVisible.value = true;
    updateTargetPath();
    host.setAttribute('active', '');
    systemSounds.open();
  };

  const hide = () => {
    if (!isVisible.value) return;
    isVisible.value = false;
    isUploading.value = false;
    isSuccess.value = false;
    showPrompt.value = false;
    progress.value = 0;
    statusText.value = 'drop files here';
    host.removeAttribute('active');
  };

  const readFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const isText = isTextFile(file.name);

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
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Smart default logic
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Determine smart defaults and available options based on dropped items
   */
  const determineOptions = (items, handles) => {
    const options = [];
    let recommended = 'copy';
    
    const hasFolder = items.some(item => item.type === 'directory' || item.kind === 'directory');
    const hasSingleTextFile = items.length === 1 && items[0].type !== 'directory' && isTextFile(items[0].name);
    const hasMultipleItems = items.length > 1;
    
    // Always offer "Copy into files"
    options.push({
      id: 'copy',
      label: 'Copy into files',
      sublabel: targetPath.value,
      icon: 'copy'
    });
    
    // For folders (with handle support)
    if (hasFolder && supportsConnections && handles.length > 0) {
      options.unshift({
        id: 'connect',
        label: 'Connect folder',
        sublabel: 'Access directly from your computer',
        icon: 'link'
      });
      recommended = 'connect';
    }
    
    // For single text/code file with handle support
    if (hasSingleTextFile && supportsHandles && handles.length > 0) {
      options.unshift({
        id: 'edit',
        label: 'Open to edit',
        sublabel: 'Changes save directly to your computer',
        icon: 'edit'
      });
      recommended = 'edit';
    }
    
    // Multiple items → recommend copy
    if (hasMultipleItems) {
      recommended = 'copy';
    }
    
    return { options, recommended };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Drop actions
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Copy files into the target path (AgentFS or /connections)
   */
  const copyFiles = async (files) => {
    const total = files.length;
    let completed = 0;

    isUploading.value = true;
    await agentfs.init();

    for (const file of files) {
      try {
        const content = await readFile(file);

        const fullPath = targetPath.value === '/'
          ? `/${file.name}`
          : `${targetPath.value}/${file.name}`;

        const dataToWrite = content instanceof ArrayBuffer
          ? new Uint8Array(content)
          : content;

        await agentfs.writeFile(fullPath, dataToWrite);

        console.log('[DropZone] Uploaded:', fullPath);

        completed++;
        progress.value = completed / total;
      } catch (err) {
        console.error('[DropZone] Upload failed:', file.name, err);
      }
    }

    isUploading.value = false;
    isSuccess.value = true;

    if (completed === total) {
      statusText.value = `uploaded ${completed} file${completed === 1 ? '' : 's'}`;
    } else {
      statusText.value = `uploaded ${completed} of ${total} files`;
    }

    systemSounds.success();

    // Refresh files app and dispatch event
    const filesApp = document.getElementById('filesApp');
    if (filesApp?.hasAttribute('open')) {
      filesApp.refresh?.();
    }

    host.dispatchEvent(new CustomEvent('files-uploaded', {
      bubbles: true,
      detail: {
        path: targetPath.value,
        app: targetApp.value
      }
    }));
  };

  /**
   * Connect a folder handle as a mount under /connections
   */
  const connectFolder = async (handle) => {
    try {
      isUploading.value = true;
      statusText.value = `connecting ${handle.name}`;
      
      const result = await agentfs.connectDirectoryHandle(handle);
      
      isUploading.value = false;
      isSuccess.value = true;
      statusText.value = `connected ${result.name}`;
      
      systemSounds.success();
      
      // Refresh files app if open
      const filesApp = document.getElementById('filesApp');
      if (filesApp?.hasAttribute('open')) {
        // Navigate to the new connection
        filesApp.navigateToPath?.(result.mountPoint);
      }
      
      host.dispatchEvent(new CustomEvent('folder-connected', {
        bubbles: true,
        detail: { mountPoint: result.mountPoint, name: result.name }
      }));
      
    } catch (err) {
      console.error('[DropZone] Failed to connect folder:', err);
      isUploading.value = false;
      statusText.value = 'connection failed';
      systemSounds.error();
    }
  };

  /**
   * Open a file for direct editing via file handle
   */
  const openForEdit = async (handle) => {
    try {
      isUploading.value = true;
      statusText.value = `opening ${handle.name}`;
      
      // Connect the file handle (creates a mount entry)
      const result = await agentfs.connectFileHandle(handle);
      
      isUploading.value = false;
      isSuccess.value = true;
      statusText.value = `opened ${result.name}`;
      
      systemSounds.success();
      
      // Open in appropriate editor
      const coderApp = document.getElementById('coderApp');
      const textEditor = document.getElementById('textEditor');
      
      if (coderApp && isTextFile(handle.name)) {
        await coderApp.open(result.mountPoint);
      } else if (textEditor) {
        await textEditor.open(result.mountPoint);
      }
      
      host.dispatchEvent(new CustomEvent('file-opened', {
        bubbles: true,
        detail: { mountPoint: result.mountPoint, name: result.name }
      }));
      
    } catch (err) {
      console.error('[DropZone] Failed to open for edit:', err);
      isUploading.value = false;
      statusText.value = 'open failed';
      systemSounds.error();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Prompt handling
  // ─────────────────────────────────────────────────────────────────────────
  
  const showActionPrompt = (items, handles) => {
    const { options, recommended } = determineOptions(items, handles);
    
    promptOptions.value = options;
    defaultOption.value = recommended;
    droppedItems.value = items;
    droppedHandles.value = handles;
    showPrompt.value = true;
    
    return new Promise((resolve) => {
      promptResolveRef.current = resolve;
    });
  };

  const handlePromptSelect = async (optionId) => {
    showPrompt.value = false;
    
    const items = droppedItems.value;
    const handles = droppedHandles.value;
    
    if (optionId === 'connect' && handles.length > 0) {
      // Find the directory handle
      const dirHandle = handles.find(h => h.kind === 'directory');
      if (dirHandle) {
        await connectFolder(dirHandle);
      }
    } else if (optionId === 'edit' && handles.length > 0) {
      // Find the file handle
      const fileHandle = handles.find(h => h.kind === 'file');
      if (fileHandle) {
        await openForEdit(fileHandle);
      }
    } else if (optionId === 'copy') {
      // Copy all files
      const files = items.filter(item => item.type !== 'directory' && item.kind !== 'directory');
      if (files.length > 0) {
        await copyFiles(files);
      }
    }
    
    if (promptResolveRef.current) {
      promptResolveRef.current(optionId);
      promptResolveRef.current = null;
    }
    
    setTimeout(() => hide(), 1500);
  };

  const handlePromptCancel = () => {
    showPrompt.value = false;
    if (promptResolveRef.current) {
      promptResolveRef.current(null);
      promptResolveRef.current = null;
    }
    hide();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Drag event handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!hasFiles(e)) return;

    dragCounter.value++;
    if (dragCounter.value === 1) {
      show();
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounter.value--;
    if (dragCounter.value === 0) {
      hide();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();

    updateTargetPath();

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounter.value = 0;

    const dataTransfer = e.dataTransfer;
    if (!dataTransfer) {
      hide();
      return;
    }

    const files = Array.from(dataTransfer.files || []);
    if (files.length === 0) {
      hide();
      return;
    }

    systemSounds.tap();

    // Try to get file handles if supported (Chromium only)
    const handles = [];
    if (supportsHandles && dataTransfer.items) {
      for (const item of dataTransfer.items) {
        if (item.kind === 'file' && item.getAsFileSystemHandle) {
          try {
            const handle = await item.getAsFileSystemHandle();
            if (handle) {
              handles.push(handle);
            }
          } catch (err) {
            console.warn('[DropZone] Could not get handle:', err);
          }
        }
      }
    }

    // Create items list with type info
    const items = files.map((file, i) => ({
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      kind: handles[i]?.kind || 'file',
      file,
      handle: handles[i] || null
    }));

    // If we have handles and connection support, show prompt
    // Otherwise, just copy files directly
    const hasConnectableFolder = items.some(item => item.kind === 'directory') && supportsConnections;
    const hasEditableFile = items.length === 1 && items[0].kind === 'file' && isTextFile(items[0].name) && supportsHandles;
    
    if ((hasConnectableFolder || hasEditableFile) && handles.length > 0) {
      await showActionPrompt(items, handles);
    } else {
      // Direct copy - no prompt needed
      statusText.value = files.length === 1
        ? `uploading ${files[0].name}`
        : `uploading ${files.length} files`;
      statusSubtext.value = `to ${targetPath.value}`;

      await copyFiles(files);
      setTimeout(() => hide(), 1500);
    }
  };

  // Setup global drag event listeners
  useEffect(() => {
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const overlayClassName = `overlay ${isVisible.value ? 'visible' : ''} ${isUploading.value ? 'uploading' : ''} ${isSuccess.value ? 'success' : ''}`;

  const getOptionIcon = (iconType) => {
    switch (iconType) {
      case 'copy':
        return html`<svg viewBox="0 0 24 24" fill="none">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>`;
      case 'link':
        return html`<svg viewBox="0 0 24 24" fill="none">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>`;
      case 'edit':
        return html`<svg viewBox="0 0 24 24" fill="none">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>`;
      default:
        return null;
    }
  };

  return html`
    <${ErrorBoundary} name="DropZone">
      <div class=${overlayClassName}>
        <div class="drop-area">
          ${showPrompt.value ? html`
            <div class="prompt">
              <span class="prompt-title">What would you like to do?</span>
              <div class="prompt-options">
                ${promptOptions.value.map(option => html`
                  <button
                    key=${option.id}
                    class=${`prompt-option ${option.id === defaultOption.value ? 'recommended' : ''}`}
                    onClick=${() => handlePromptSelect(option.id)}
                  >
                    <div class="prompt-option-icon">
                      ${getOptionIcon(option.icon)}
                    </div>
                    <div class="prompt-option-text">
                      <span class="prompt-option-label">${option.label}</span>
                      <span class="prompt-option-sublabel">${option.sublabel}</span>
                    </div>
                    ${option.id === defaultOption.value && html`
                      <span class="prompt-option-badge">recommended</span>
                    `}
                  </button>
                `)}
              </div>
              <button class="prompt-cancel" onClick=${handlePromptCancel}>cancel</button>
            </div>
          ` : html`
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

            <span class="text">${statusText.value}</span>
            <span class="subtext">${statusSubtext.value}</span>

            <div class="progress-bar">
              <div class="progress-fill" style=${{ width: `${progress.value * 100}%` }}></div>
            </div>

            <div class="file-preview"></div>
          `}
        </div>
      </div>
    <//>
  `;
}

export default createShadowComponent(DropZone, {
  tag: 'drop-zone',
  styleUrl: new URL('./styles.css', import.meta.url).href,
});
