/**
 * Drop Zone Component
 * Beautiful drag & drop overlay for file uploads
 * Integrates with app context to upload to current working directory
 * Migrated to Preact + HTM + Signals
 */

import { html } from 'htm/preact';
import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { createShadowComponent } from '../shared/shadow-component.js';
import { ErrorBoundary } from '../shared/error-boundary.js';
import { agentfs, systemSounds } from '../../services/index.js';

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
    progress.value = 0;
    statusText.value = 'drop files here';
    host.removeAttribute('active');
  };

  const isTextFile = (name) => {
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

  const uploadFiles = async (files) => {
    const total = files.length;
    let completed = 0;

    isUploading.value = true;
    await agentfs.init();

    for (const file of files) {
      try {
        const content = await readFile(file);

        console.log('[DropZone] Content type:', typeof content, content?.constructor?.name);
        console.log('[DropZone] Content size:', content?.length || content?.byteLength);

        const fullPath = targetPath.value === '/'
          ? `/${file.name}`
          : `${targetPath.value}/${file.name}`;

        const dataToWrite = content instanceof ArrayBuffer
          ? new Uint8Array(content)
          : content;

        console.log('[DropZone] Writing as:', dataToWrite?.constructor?.name);

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
      filesApp.navigateTo?.(filesApp.currentPath || '/');
    }

    host.dispatchEvent(new CustomEvent('files-uploaded', {
      bubbles: true,
      detail: {
        path: targetPath.value,
        app: targetApp.value
      }
    }));
  };

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

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) {
      hide();
      return;
    }

    systemSounds.success();

    const fileCount = files.length;
    statusText.value = fileCount === 1
      ? `uploading ${files[0].name}`
      : `uploading ${fileCount} files`;
    statusSubtext.value = `to ${targetPath.value}`;

    await uploadFiles(Array.from(files));

    setTimeout(() => hide(), 1500);
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

  const overlayClassName = `overlay ${isVisible.value ? 'visible' : ''} ${isUploading.value ? 'uploading' : ''} ${isSuccess.value ? 'success' : ''}`;

  return html`
    <${ErrorBoundary} name="DropZone">
      <div class=${overlayClassName}>
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

          <span class="text">${statusText.value}</span>
          <span class="subtext">${statusSubtext.value}</span>

          <div class="progress-bar">
            <div class="progress-fill" style=${{ width: `${progress.value * 100}%` }}></div>
          </div>

          <div class="file-preview"></div>
        </div>
      </div>
    <//>
  `;
}

export default createShadowComponent(DropZone, {
  tag: 'drop-zone',
  styleUrl: new URL('./styles.css', import.meta.url).href,
});
