/**
 * Drop Zone Component
 * Beautiful drag & drop overlay for file uploads
 * Integrates with app context to upload to current working directory
 * Migrated to Preact + HTM + Signals
 */

import { html } from 'htm/preact';
import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { createShadowComponent } from '../lib/shadow-component.js';
import { ErrorBoundary } from '../lib/error-boundary.js';
import { agentfs, systemSounds } from '../services/index.js';

const styles = `
  :host {
    position: fixed;
    inset: 0;
    z-index: 9999;
    pointer-events: none;
  }

  :host([active]) {
    pointer-events: auto;
  }

  /* Overlay backdrop */
  .overlay {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: oklch(0.25 0.08 25 / 0.92);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.4s ease, visibility 0.4s ease;
  }

  .overlay.visible {
    opacity: 1;
    visibility: visible;
  }

  /* Drop area - centered card */
  .drop-area {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    padding: 4rem 5rem;
    border: 2px dashed oklch(1 0 0 / 0.25);
    border-radius: 2rem;
    background: oklch(1 0 0 / 0.04);
    transition: all 0.3s ease;
    max-width: 90vw;
    overflow: hidden;
  }

  .overlay.visible .drop-area {
    animation: drop-area-appear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes drop-area-appear {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  /* Hover state when files are being dragged over */
  .overlay.visible .drop-area:hover {
    border-color: oklch(1 0 0 / 0.5);
    background: oklch(1 0 0 / 0.08);
    transform: scale(1.02);
  }

  /* Ripple animation container */
  .ripple-container {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
    border-radius: inherit;
  }

  .ripple {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 200%;
    height: 200%;
    border: 2px solid oklch(1 0 0 / 0.1);
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(0);
    animation: ripple-expand 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  .ripple.delay-1 {
    animation-delay: 1s;
  }

  .ripple.delay-2 {
    animation-delay: 2s;
  }

  @keyframes ripple-expand {
    0% {
      transform: translate(-50%, -50%) scale(0);
      opacity: 0.6;
    }
    100% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0;
    }
  }

  /* Icon container */
  .icon {
    width: 80px;
    height: 80px;
    display: grid;
    place-items: center;
    position: relative;
  }

  .icon svg {
    width: 100%;
    height: 100%;
    stroke: oklch(1 0 0 / 0.7);
    stroke-width: 1.5;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .icon .arrow {
    stroke: oklch(1 0 0 / 0.9);
    stroke-width: 2;
    animation: arrow-bounce 1.5s ease-in-out infinite;
  }

  .icon .cloud {
    stroke: oklch(1 0 0 / 0.5);
  }

  .icon .tray {
    fill: oklch(1 0 0 / 0.15);
    stroke: oklch(1 0 0 / 0.5);
  }

  @keyframes arrow-bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }
  }

  /* Text styles */
  .text {
    font-family: var(--font-body, 'Cormorant Garamond', serif);
    font-size: 1.5rem;
    font-style: italic;
    color: oklch(1 0 0 / 0.9);
    letter-spacing: 0.08em;
    text-align: center;
  }

  .subtext {
    font-family: var(--font-body, 'Cormorant Garamond', serif);
    font-size: 0.9rem;
    font-style: italic;
    color: oklch(1 0 0 / 0.5);
    letter-spacing: 0.1em;
    text-align: center;
  }

  /* Progress bar */
  .progress-bar {
    width: 100%;
    max-width: 250px;
    height: 3px;
    background: oklch(1 0 0 / 0.15);
    border-radius: 2px;
    overflow: hidden;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .overlay.uploading .progress-bar {
    opacity: 1;
  }

  .progress-fill {
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg,
      oklch(0.7 0.15 70) 0%,
      oklch(1 0 0) 100%
    );
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  /* Uploading state */
  .overlay.uploading .icon .arrow {
    animation: arrow-upload 0.8s ease-in-out infinite;
  }

  @keyframes arrow-upload {
    0%, 100% {
      transform: translateY(0);
      opacity: 1;
    }
    50% {
      transform: translateY(-12px);
      opacity: 0.5;
    }
  }

  .overlay.uploading .ripple {
    animation: none;
    opacity: 0;
  }

  /* Success state */
  .overlay.success .drop-area {
    border-color: oklch(0.7 0.15 140 / 0.5);
    background: oklch(0.7 0.15 140 / 0.08);
  }

  .overlay.success .icon svg {
    stroke: oklch(0.8 0.15 140);
  }

  .overlay.success .icon .arrow {
    animation: check-appear 0.5s ease forwards;
  }

  @keyframes check-appear {
    0% {
      transform: scale(0);
    }
    50% {
      transform: scale(1.2);
    }
    100% {
      transform: scale(1);
    }
  }

  .overlay.success .text {
    color: oklch(0.9 0.1 140);
  }

  .overlay.success .progress-fill {
    background: oklch(0.7 0.15 140);
  }

  /* File preview area (for future enhancement) */
  .file-preview {
    display: none; /* Hidden by default */
  }

  /* HDR Enhancement */
  @media (dynamic-range: high) {
    .text {
      color: var(--hdr-white-bright, oklch(1.15 0 0));
    }

    .icon .arrow {
      stroke: var(--hdr-white-vivid, oklch(1.3 0 0));
    }

    .overlay.success .text {
      color: oklch(1.1 0.12 140);
    }

    .progress-fill {
      background: linear-gradient(90deg,
        oklch(0.8 0.18 70) 0%,
        oklch(1.3 0 0) 100%
      );
    }
  }

  /* Responsive */
  @media (max-width: 700px) {
    .drop-area {
      padding: 3rem;
      gap: 1.25rem;
    }

    .icon {
      width: 60px;
      height: 60px;
    }

    .text {
      font-size: 1.25rem;
    }

    .subtext {
      font-size: 0.8rem;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .ripple,
    .icon .arrow {
      animation: none;
    }

    .drop-area,
    .overlay {
      transition-duration: 0.1s;
    }
  }
`;

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

export default createShadowComponent(DropZone, { tag: 'drop-zone', styles });
