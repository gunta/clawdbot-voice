/**
 * Files App Component
 * Spatial file browser with canvas-based layout
 * Supports both AgentFS and /connections (local folders via File System Access API)
 */
import { html } from 'htm/preact';
import { useSignal, useComputed, useSignalEffect } from '@preact/signals';
import { useRef, useEffect } from 'preact/hooks';
import { createShadowComponent } from '../shared/shadow-component.js';
import { ErrorBoundary } from '../shared/error-boundary.js';
import { agentfs, appContext, systemSounds, navigationService } from '../../services/index.js';

// Constants
const CODE_EXTENSIONS = new Set([
  'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx',
  'html', 'htm', 'css', 'scss', 'sass', 'less',
  'json', 'yaml', 'yml', 'toml', 'xml', 'svg',
  'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp', 'cc',
  'sh', 'bash', 'zsh',
  'sql', 'graphql', 'gql',
]);

const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp',
  'bmp', 'ico', 'tiff', 'tif', 'avif', 'heic', 'heif'
]);

const SYSTEM_FOLDERS = new Set([
  'memories', 'notes', 'conversations', 'favorites',
  'projects', 'documents', 'music', 'pictures',
  'videos', 'recordings', 'downloads', 'uploads',
  'settings', 'temporary', 'connections'
]);

const CONNECTIONS_PREFIX = '/connections';

// Helper functions for file type detection
function isCodeFile(path) {
  const ext = path.split('.').pop()?.toLowerCase();
  return ext && CODE_EXTENSIONS.has(ext);
}

function isImageFile(path) {
  const ext = path.split('.').pop()?.toLowerCase();
  return ext && IMAGE_EXTENSIONS.has(ext);
}

/**
 * Check if path is a directory using unified fs
 */
async function isDirectory(path) {
  try {
    const stats = await agentfs.stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if a path is under /connections
 */
function isConnectionPath(path) {
  return agentfs.isConnectionPath(path);
}

// Icon generation functions
function getSystemFolderIcon(name) {
  const icons = {
    memories: html`<svg viewBox="0 0 24 24">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      <circle cx="17" cy="5" r="1.5" fill="currentColor" opacity="0.6"/>
      <circle cx="19" cy="7" r="1" fill="currentColor" opacity="0.4"/>
    </svg>`,
    notes: html`<svg viewBox="0 0 24 24">
      <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
      <line x1="8" y1="16" x2="14" y2="16"/>
    </svg>`,
    conversations: html`<svg viewBox="0 0 24 24">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      <circle cx="9" cy="12" r="1" fill="currentColor"/>
      <circle cx="12" cy="12" r="1" fill="currentColor"/>
      <circle cx="15" cy="12" r="1" fill="currentColor"/>
    </svg>`,
    favorites: html`<svg viewBox="0 0 24 24">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>`,
    projects: html`<svg viewBox="0 0 24 24">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
      <line x1="12" y1="4" x2="12" y2="20" opacity="0.3"/>
    </svg>`,
    documents: html`<svg viewBox="0 0 24 24">
      <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>`,
    music: html`<svg viewBox="0 0 24 24">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>`,
    pictures: html`<svg viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>`,
    videos: html`<svg viewBox="0 0 24 24">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <polygon points="10 8 16 11 10 14 10 8" fill="currentColor" opacity="0.6"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>`,
    recordings: html`<svg viewBox="0 0 24 24">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>`,
    downloads: html`<svg viewBox="0 0 24 24">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>`,
    uploads: html`<svg viewBox="0 0 24 24">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>`,
    settings: html`<svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>`,
    temporary: html`<svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>`,
    connections: html`<svg viewBox="0 0 24 24">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
      <path d="M7 8h4M7 11h6" opacity="0.5"/>
    </svg>`
  };
  return icons[name] || html`<svg viewBox="0 0 24 24">
    <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" />
  </svg>`;
}

function getFolderIcon(name = '') {
  const folderName = name.toLowerCase();
  if (SYSTEM_FOLDERS.has(folderName)) {
    return getSystemFolderIcon(folderName);
  }
  return html`<svg viewBox="0 0 24 24">
    <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" />
  </svg>`;
}

function getFileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase();

  if (IMAGE_EXTENSIONS.has(ext)) {
    return html`<svg viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>`;
  }

  if (ext === 'json' || ext === 'yaml' || ext === 'yml' || ext === 'toml') {
    return html`<svg viewBox="0 0 24 24">
      <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>`;
  }

  if (ext === 'txt' || ext === 'md' || ext === 'markdown') {
    return html`<svg viewBox="0 0 24 24">
      <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
    </svg>`;
  }

  return html`<svg viewBox="0 0 24 24">
    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>`;
}

function FilesApp({ host }) {
  const isVisible = useSignal(false);
  const currentPath = useSignal('/');
  const files = useSignal([]);
  const selectedFile = useSignal(null);
  const contextMenuVisible = useSignal(false);
  const contextMenuPosition = useSignal({ x: 0, y: 0 });
  const zoom = useSignal(1);
  const zoomIndicatorVisible = useSignal(false);
  const isLoading = useSignal(false);
  const title = useSignal('files');
  
  // Connections state
  const mounts = useSignal([]);  // List of connected folders/files
  const isInConnections = useComputed(() => isConnectionPath(currentPath.value));
  const isConnectionsRoot = useComputed(() => 
    currentPath.value === CONNECTIONS_PREFIX || currentPath.value === CONNECTIONS_PREFIX + '/'
  );
  const connectionsSupported = agentfs.isConnectionsSupported();
  
  // Internal folder navigation history
  const pathHistory = useSignal([]);  // Stack of visited paths
  const pathFuture = useSignal([]);   // Stack for forward navigation
  const canNavigateBack = useComputed(() => pathHistory.value.length > 0);
  const canNavigateForward = useComputed(() => pathFuture.value.length > 0);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const zoomTimeoutRef = useRef(null);
  const isPinching = useRef(false);
  const lastPinchDistance = useRef(0);

  // Computed breadcrumb
  const pathSegments = useComputed(() => {
    const segments = currentPath.value.split('/').filter(Boolean);
    const result = [{ path: '/', label: '/' }];
    let buildPath = '';
    segments.forEach(seg => {
      buildPath += '/' + seg;
      result.push({ path: buildPath, label: seg });
    });
    return result;
  });

  // Load files function
  const loadFiles = async () => {
    if (!canvasRef.current) return;

    isLoading.value = true;

    try {
      await agentfs.init();
      
      // Load mounts for reference (used for metadata and actions)
      if (connectionsSupported) {
        try {
          mounts.value = await agentfs.listConnections();
        } catch (err) {
          console.warn('[FilesApp] Failed to load mounts:', err);
          mounts.value = [];
        }
      }
      
      const entries = await agentfs.readdir(currentPath.value);

      const fileList = await Promise.all(
        entries.map(async (name) => {
          const fullPath = currentPath.value === '/'
            ? `/${name}`
            : `${currentPath.value}/${name}`;

          try {
            const stats = await agentfs.stat(fullPath);
            const isDir = stats.isDirectory();
            const isLocal = isConnectionPath(fullPath);
            
            // Find mount metadata for top-level connections items
            let mountInfo = null;
            if (isConnectionsRoot.value) {
              mountInfo = mounts.value.find(m => m.name === name);
            }
            
            return {
              name,
              path: fullPath,
              type: isDir ? 'folder' : 'file',
              isLocal,
              mountInfo,
              permissionState: mountInfo?.permissionState || 'granted'
            };
          } catch (err) {
            // If stat fails (e.g., permission denied), still show the item
            const isLocal = isConnectionPath(fullPath);
            let mountInfo = null;
            if (isConnectionsRoot.value) {
              mountInfo = mounts.value.find(m => m.name === name);
            }
            
            return {
              name,
              path: fullPath,
              type: mountInfo?.kind === 'file' ? 'file' : 'folder',
              isLocal,
              mountInfo,
              permissionState: mountInfo?.permissionState || 'prompt'
            };
          }
        })
      );

      // Sort: folders first, then files
      fileList.sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });

      files.value = fileList;
      updateTitle();
    } catch (err) {
      console.error('[FilesApp] Failed to load files:', err);
      files.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  // Update title
  const updateTitle = () => {
    const pathName = currentPath.value === '/'
      ? 'files'
      : currentPath.value.split('/').filter(Boolean).pop() || 'files';
    title.value = pathName.toLowerCase();
    navigationService.updateTitle(pathName);
  };

  // Navigation handlers
  const handleClose = () => {
    systemSounds.close();
    navigationService.updateState({ path: currentPath.value });
    navigationService.close();
  };

  const handleBack = () => {
    if (canNavigateBack.value) {
      systemSounds.back();
      // Push current path to future stack
      pathFuture.value = [currentPath.value, ...pathFuture.value];
      // Pop from history
      const [prevPath, ...rest] = pathHistory.value;
      pathHistory.value = rest;
      currentPath.value = prevPath;
      loadFiles();
    }
  };

  const handleForward = () => {
    if (canNavigateForward.value) {
      systemSounds.tap();
      // Push current path to history stack
      pathHistory.value = [currentPath.value, ...pathHistory.value];
      // Pop from future
      const [nextPath, ...rest] = pathFuture.value;
      pathFuture.value = rest;
      currentPath.value = nextPath;
      loadFiles();
    }
  };

  const navigateTo = async (path, addToHistory = true) => {
    if (addToHistory && currentPath.value !== path) {
      // Push current path to history before navigating
      pathHistory.value = [currentPath.value, ...pathHistory.value];
      // Clear future stack on new navigation
      pathFuture.value = [];
    }
    currentPath.value = path;
    appContext.recordAction('files', 'navigate', { path });
    await loadFiles();
  };

  const navigateUp = async () => {
    if (currentPath.value === '/' || !canvasRef.current) return;

    systemSounds.zoomOut();

    const canvas = canvasRef.current;
    canvas.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease';
    canvas.style.transform = 'scale(0.5)';
    canvas.style.opacity = '0';

    await new Promise(resolve => setTimeout(resolve, 300));

    // Add current path to history
    pathHistory.value = [currentPath.value, ...pathHistory.value];
    pathFuture.value = [];

    const segments = currentPath.value.split('/').filter(Boolean);
    segments.pop();
    currentPath.value = '/' + segments.join('/') || '/';
    zoom.value = 1;

    canvas.style.transition = 'none';
    canvas.style.transform = 'scale(2)';
    canvas.style.opacity = '0';

    await loadFiles();

    requestAnimationFrame(() => {
      canvas.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease';
      canvas.style.transform = 'scale(1)';
      canvas.style.opacity = '1';
    });
  };

  // File interaction handlers
  const handleNodeClick = async (file) => {
    // If this is a mount that needs permission, request it first
    if (file.mountInfo && file.permissionState !== 'granted') {
      const granted = await agentfs.requestConnectionPermission(file.mountInfo.id);
      if (!granted) {
        systemSounds.error();
        return;
      }
      systemSounds.success();
      // Reload to update permission state
      await loadFiles();
    }
    
    if (file.type === 'folder') {
      await zoomIntoFolder(file);
    } else {
      await previewFile(file.path);
    }
  };

  const zoomIntoFolder = async (file) => {
    if (!canvasRef.current) return;

    systemSounds.zoomIn();

    const canvas = canvasRef.current;
    canvas.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    canvas.style.transform = 'scale(2.5)';
    canvas.style.opacity = '0';

    await new Promise(resolve => setTimeout(resolve, 400));

    // Add current path to history before navigating into folder
    pathHistory.value = [currentPath.value, ...pathHistory.value];
    pathFuture.value = [];

    currentPath.value = file.path;
    zoom.value = 1;

    canvas.style.transition = 'none';
    canvas.style.transform = 'scale(0.5)';
    canvas.style.opacity = '0';

    await loadFiles();

    requestAnimationFrame(() => {
      canvas.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease';
      canvas.style.transform = 'scale(1)';
      canvas.style.opacity = '1';
    });
  };

  const previewFile = async (path) => {
    try {
      appContext.recordAction('files', 'open-file', { path });

      if (isImageFile(path)) {
        const imageViewer = document.getElementById('imageViewerApp');
        if (imageViewer) {
          await imageViewer.open(path);
        }
      } else if (isCodeFile(path)) {
        const coderApp = document.getElementById('coderApp');
        if (coderApp) {
          await coderApp.open(path);
        } else {
          const textEditor = document.getElementById('textEditor');
          await textEditor?.open(path);
        }
      } else {
        const textEditor = document.getElementById('textEditor');
        if (textEditor) {
          await textEditor.open(path);
        }
      }
    } catch (err) {
      console.error('[FilesApp] Failed to open file:', err);
    }
  };

  // Context menu handlers
  const handleContextMenu = (e, file) => {
    e.preventDefault();
    e.stopPropagation();

    selectedFile.value = file;
    contextMenuPosition.value = { x: e.clientX, y: e.clientY };
    contextMenuVisible.value = true;
    systemSounds.tap();
  };

  const hideContextMenu = () => {
    contextMenuVisible.value = false;
    selectedFile.value = null;
  };

  const handleContextAction = async (action) => {
    const target = selectedFile.value;
    hideContextMenu();

    if (!target) return;

    switch (action) {
      case 'open':
        await handleNodeClick(target);
        break;
      case 'copy':
        await copyToClipboard(target);
        break;
      case 'download':
        await downloadTarget(target);
        break;
      case 'delete':
        await deleteTarget(target);
        break;
      case 'disconnect':
        await handleDisconnect(target);
        break;
      case 'request-permission':
        await handleRequestPermission(target);
        break;
      case 'copy-to-app':
        await handleCopyToAppStorage(target);
        break;
      case 'save-to-computer':
        await handleSaveToComputer(target);
        break;
    }
  };

  const copyToClipboard = async (target) => {
    try {
      if (target.type === 'file') {
        const content = await agentfs.readFile(target.path);
        await navigator.clipboard.writeText(content);
        appContext.recordAction('files', 'copy-content', { path: target.path });
      } else {
        await navigator.clipboard.writeText(target.path);
        appContext.recordAction('files', 'copy-path', { path: target.path });
      }
      systemSounds.success();
    } catch (err) {
      console.error('[FilesApp] Failed to copy:', err);
      systemSounds.error();
    }
  };

  const downloadTarget = async (target) => {
    try {
      appContext.recordAction('files', 'download', { path: target.path, type: target.type });

      if (target.type === 'file') {
        const content = await agentfs.readFile(target.path);
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = target.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const entries = await agentfs.readdir(target.path);
        const listing = `Folder: ${target.path}\n\nContents:\n${entries.map(e => `  - ${e}`).join('\n')}`;

        const blob = new Blob([listing], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${target.name}-listing.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      systemSounds.success();
    } catch (err) {
      console.error('[FilesApp] Failed to download:', err);
      systemSounds.error();
    }
  };

  const deleteTarget = async (target) => {
    const confirmed = confirm(`Delete "${target.name}"?\n\nThis action cannot be undone.`);
    if (!confirmed) return;

    try {
      if (target.type === 'file') {
        await agentfs.deleteFile(target.path);
      } else {
        await deleteFolderRecursive(target.path);
      }

      appContext.recordAction('files', 'delete', { path: target.path, type: target.type });
      systemSounds.confirm();
      await loadFiles();
    } catch (err) {
      console.error('[FilesApp] Failed to delete:', err);
      systemSounds.error();
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const deleteFolderRecursive = async (path) => {
    const entries = await agentfs.readdir(path);

    for (const name of entries) {
      const fullPath = path === '/' ? `/${name}` : `${path}/${name}`;
      const isDir = await isDirectory(fullPath);

      if (isDir) {
        await deleteFolderRecursive(fullPath);
      } else {
        await agentfs.deleteFile(fullPath);
      }
    }

    await agentfs.rmdir(path);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Connections handlers
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Connect a new folder from the user's computer
   */
  const handleConnectFolder = async () => {
    if (!connectionsSupported) return;
    
    try {
      systemSounds.tap();
      const result = await agentfs.connectFolder();
      
      if (result) {
        systemSounds.success();
        appContext.recordAction('files', 'connect-folder', { name: result.name });
        await loadFiles();
        
        // Navigate to the new mount
        if (result.mountPoint) {
          await navigateTo(result.mountPoint);
        }
      }
    } catch (err) {
      console.error('[FilesApp] Failed to connect folder:', err);
      systemSounds.error();
    }
  };
  
  /**
   * Disconnect a mount (only removes reference, doesn't delete local files)
   */
  const handleDisconnect = async (target) => {
    if (!target?.mountInfo?.id) return;
    
    const confirmed = confirm(
      `Disconnect "${target.name}"?\n\nThis only removes the connection. Your files on your computer will not be deleted.`
    );
    if (!confirmed) return;
    
    try {
      await agentfs.disconnectConnection(target.mountInfo.id);
      systemSounds.confirm();
      appContext.recordAction('files', 'disconnect', { name: target.name });
      await loadFiles();
    } catch (err) {
      console.error('[FilesApp] Failed to disconnect:', err);
      systemSounds.error();
    }
  };
  
  /**
   * Request permission for a mount that needs access
   */
  const handleRequestPermission = async (target) => {
    if (!target?.mountInfo?.id) return;
    
    try {
      systemSounds.tap();
      const granted = await agentfs.requestConnectionPermission(target.mountInfo.id);
      
      if (granted) {
        systemSounds.success();
        await loadFiles();
      }
    } catch (err) {
      console.error('[FilesApp] Failed to request permission:', err);
      systemSounds.error();
    }
  };
  
  /**
   * Copy a local file to app storage (AgentFS)
   */
  const handleCopyToAppStorage = async (target) => {
    if (!target?.isLocal) return;
    
    try {
      systemSounds.tap();
      
      // Determine destination path (mirror structure in /uploads or same name)
      const fileName = target.name;
      const destPath = `/uploads/${fileName}`;
      
      if (target.type === 'file') {
        const content = await agentfs.readFile(target.path);
        await agentfs.writeFile(destPath, content);
        systemSounds.success();
        appContext.recordAction('files', 'copy-to-app', { from: target.path, to: destPath });
      } else {
        // For folders, we'd need recursive copy - simplified for now
        alert('Copying folders is not yet supported. Please copy individual files.');
      }
    } catch (err) {
      console.error('[FilesApp] Failed to copy to app storage:', err);
      systemSounds.error();
      alert(`Failed to copy: ${err.message}`);
    }
  };
  
  /**
   * Save an app storage file to a connected folder
   */
  const handleSaveToComputer = async (target) => {
    if (target?.isLocal || !connectionsSupported) return;
    
    // Check if we have any connections
    if (mounts.value.length === 0) {
      const shouldConnect = confirm(
        'No connected folders yet.\n\nWould you like to connect a folder from your computer?'
      );
      if (shouldConnect) {
        await handleConnectFolder();
      }
      return;
    }
    
    // For now, use the first available directory mount
    const dirMount = mounts.value.find(m => m.kind === 'directory' && m.permissionState === 'granted');
    
    if (!dirMount) {
      alert('No connected folder available. Please connect a folder first or grant access to an existing one.');
      return;
    }
    
    try {
      systemSounds.tap();
      
      const fileName = target.name;
      const destPath = `${dirMount.mountPoint}/${fileName}`;
      
      const content = await agentfs.readFile(target.path);
      await agentfs.writeFile(destPath, content);
      
      systemSounds.success();
      appContext.recordAction('files', 'save-to-computer', { from: target.path, to: destPath });
    } catch (err) {
      console.error('[FilesApp] Failed to save to computer:', err);
      systemSounds.error();
      alert(`Failed to save: ${err.message}`);
    }
  };

  // Zoom handlers
  const handleWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) return;

    e.preventDefault();

    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    zoom.value = Math.max(0.5, Math.min(2, zoom.value + delta));

    showZoomIndicator();
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      isPinching.current = true;
      lastPinchDistance.current = getTouchDistance(e.touches);
    }
  };

  const handleTouchMove = (e) => {
    if (!isPinching.current || e.touches.length !== 2) return;

    e.preventDefault();

    const distance = getTouchDistance(e.touches);
    const delta = (distance - lastPinchDistance.current) * 0.005;

    zoom.value = Math.max(0.5, Math.min(2, zoom.value + delta));
    lastPinchDistance.current = distance;

    showZoomIndicator();
  };

  const handleTouchEnd = () => {
    isPinching.current = false;
    lastPinchDistance.current = 0;
  };

  const getTouchDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const showZoomIndicator = () => {
    zoomIndicatorVisible.value = true;

    clearTimeout(zoomTimeoutRef.current);
    zoomTimeoutRef.current = setTimeout(() => {
      zoomIndicatorVisible.value = false;
    }, 1500);
  };

  // Keyboard handler
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (contextMenuVisible.value) {
        hideContextMenu();
      } else {
        handleClose();
      }
    } else if (e.key === 'Backspace' && !e.target.matches('input, textarea')) {
      e.preventDefault();
      navigateUp();
    }
  };

  // Subscribe to navigation service
  useEffect(() => {
    const unsubscribe = navigationService.subscribe((snapshot) => {
      const { current } = snapshot.context;
      const isFilesActive = current?.id === 'files';

      if (isFilesActive && !isVisible.value) {
        isVisible.value = true;
        host.setAttribute('open', '');
        if (current.state?.path) {
          currentPath.value = current.state.path;
        }
        loadFiles();
        document.addEventListener('keydown', handleKeyDown);
      } else if (!isFilesActive && isVisible.value) {
        isVisible.value = false;
        host.removeAttribute('open');
        document.removeEventListener('keydown', handleKeyDown);
      }
    });

    return () => {
      unsubscribe();
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Apply zoom effect
  useSignalEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.style.transform = `scale(${zoom.value})`;
    }
  });

  // Set up touch/wheel events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Expose methods on host
  useEffect(() => {
    host.open = async (path) => {
      systemSounds.open();
      if (path) {
        currentPath.value = path;
      }
      navigationService.push('files', 'Files', { path: currentPath.value });
    };
    host.close = handleClose;
    host.navigateToPath = navigateTo;
    host.refresh = loadFiles;
    if (!Object.getOwnPropertyDescriptor(host, 'currentPath')) {
      Object.defineProperty(host, 'currentPath', {
        configurable: true,
        get: () => currentPath.value,
        set: (path) => { currentPath.value = path; }
      });
    }
    if (!Object.getOwnPropertyDescriptor(host, 'currentWorkingDirectory')) {
      Object.defineProperty(host, 'currentWorkingDirectory', {
        configurable: true,
        get: () => currentPath.value
      });
    }
    if (!Object.getOwnPropertyDescriptor(host, 'isOpen')) {
      Object.defineProperty(host, 'isOpen', {
        configurable: true,
        get: () => isVisible.value
      });
    }
  }, []);

  return html`
    <${ErrorBoundary} name="FilesApp">
      <div class="header">
        <div class="header-left">
          <button
            class="back-btn"
            type="button"
            onClick=${handleBack}
            disabled=${!canNavigateBack.value}
            aria-label="Go back"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" />
            </svg>
          </button>
          <button
            class="forward-btn"
            type="button"
            onClick=${handleForward}
            disabled=${!canNavigateForward.value}
            aria-label="Go forward"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M9 18L15 12L9 6" />
            </svg>
          </button>
          <span class="title">${title}</span>
        </div>
        <div class="path">
          ${pathSegments.value.map((seg, i) => html`
            ${i > 0 && html`<span class="path-separator">/</span>`}
            <span
              class="path-segment"
              onClick=${() => navigateTo(seg.path)}
            >
              ${seg.label}
            </span>
          `)}
        </div>
        ${isInConnections.value && connectionsSupported && html`
          <button class="connect-btn" type="button" onClick=${handleConnectFolder} title="Connect a folder from your computer">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        `}
        <button class="close-btn" type="button" onClick=${handleClose}>
          <svg viewBox="0 0 24 24" fill="none">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </div>

      <div class="canvas-container" ref=${containerRef}>
        <div class="canvas" ref=${canvasRef}>
          ${isLoading.value ? html`
            <div class="loading">
              <div class="loading-spinner"></div>
            </div>
          ` : files.value.length === 0 ? html`
            <div class="empty-state">
              ${isConnectionsRoot.value ? html`
                <svg viewBox="0 0 24 24">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
                <span class="empty-state-text">no connected folders yet</span>
                ${connectionsSupported && html`
                  <button class="empty-state-btn" type="button" onClick=${handleConnectFolder}>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                    connect a folder
                  </button>
                `}
              ` : html`
                <svg viewBox="0 0 24 24">
                  <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="empty-state-text">this space is empty</span>
              `}
            </div>
          ` : files.value.map((file, index) => html`
            <div
              class=${`node ${file.isLocal ? 'node--local' : ''} ${file.permissionState === 'prompt' ? 'node--needs-access' : ''}`}
              data-path=${file.path}
              data-type=${file.type}
              data-name=${file.name}
              data-local=${file.isLocal || undefined}
              tabindex="0"
              role="button"
              draggable="true"
              style=${{ animationDelay: `${index * 0.05}s` }}
              onClick=${() => handleNodeClick(file)}
              onContextMenu=${(e) => handleContextMenu(e, file)}
              onKeyDown=${(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleNodeClick(file);
                }
              }}
            >
              <div class="node-icon">
                ${file.type === 'folder' ? getFolderIcon(file.name) : getFileIcon(file.name)}
              </div>
              <span class="node-name" title=${file.name}>${file.name}</span>
              ${file.isLocal && html`<span class="node-badge node-badge--local" title="On your computer">local</span>`}
              ${file.permissionState === 'prompt' && html`<span class="node-badge node-badge--access" title="Click to grant access">needs access</span>`}
            </div>
          `)}
        </div>
        <div class=${`zoom-indicator ${zoomIndicatorVisible.value ? 'visible' : ''}`}>
          ${Math.round(zoom.value * 100)}%
        </div>
      </div>

      ${contextMenuVisible.value && html`
        <div
          class="context-menu visible"
          style=${{
            left: contextMenuPosition.value.x + 'px',
            top: contextMenuPosition.value.y + 'px'
          }}
          onClick=${(e) => e.stopPropagation()}
        >
          ${/* Permission needed for mount */ ''}
          ${selectedFile.value?.permissionState === 'prompt' && html`
            <button class="context-menu-item context-menu-item--primary" onClick=${() => handleContextAction('request-permission')}>
              <svg viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              grant access
            </button>
            <div class="context-menu-separator"></div>
          `}
          
          <button class="context-menu-item" onClick=${() => handleContextAction('open')}>
            <svg viewBox="0 0 24 24">
              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            open
          </button>
          
          <button class="context-menu-item" onClick=${() => handleContextAction('copy')}>
            <svg viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            copy
          </button>
          
          ${/* Local file: copy to app storage */ ''}
          ${selectedFile.value?.isLocal && selectedFile.value?.type === 'file' && html`
            <button class="context-menu-item" onClick=${() => handleContextAction('copy-to-app')}>
              <svg viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              copy to app storage
            </button>
          `}
          
          ${/* App storage file: save to computer */ ''}
          ${!selectedFile.value?.isLocal && selectedFile.value?.type === 'file' && connectionsSupported && html`
            <button class="context-menu-item" onClick=${() => handleContextAction('save-to-computer')}>
              <svg viewBox="0 0 24 24">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              save to computer
            </button>
          `}
          
          ${/* Download (for app storage) */ ''}
          ${!selectedFile.value?.isLocal && html`
            <button class="context-menu-item" onClick=${() => handleContextAction('download')}>
              <svg viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              download
            </button>
          `}
          
          <div class="context-menu-separator"></div>
          
          ${/* Disconnect (for top-level mounts) */ ''}
          ${selectedFile.value?.mountInfo && html`
            <button class="context-menu-item" onClick=${() => handleContextAction('disconnect')}>
              <svg viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
              disconnect
            </button>
          `}
          
          ${/* Delete (for non-mount items) */ ''}
          ${!selectedFile.value?.mountInfo && html`
            <button class="context-menu-item context-menu-item--danger" onClick=${() => handleContextAction('delete')}>
              <svg viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              delete
            </button>
          `}
        </div>
      `}

      <div class="time-scrubber">
        <span class="time-label">past</span>
        <div class="time-slider">
          <div class="time-slider-fill"></div>
          <div class="time-slider-thumb"></div>
        </div>
        <span class="time-label">now</span>
      </div>
    <//>
  `;
}

export default createShadowComponent(FilesApp, {
  tag: 'files-app',
  styleUrl: new URL('./styles.css', import.meta.url).href,
});
