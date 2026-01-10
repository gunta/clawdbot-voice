/**
 * Image Viewer App Component
 * Elegant gallery for viewing image files with zoom and navigation
 */
import { html } from 'htm/preact';
import { useSignal, useComputed, useSignalEffect } from '@preact/signals';
import { useRef, useEffect } from 'preact/hooks';
import { createShadowComponent } from '../lib/shadow-component.js';
import { ErrorBoundary } from '../lib/error-boundary.js';
import { agentfs, appContext, systemSounds, navigationService } from '../services/index.js';

/**
 * Supported image extensions
 */
const imageExtensions = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',
  'bmp', 'ico', 'tiff', 'tif', 'avif', 'heic', 'heif'
]);

/**
 * Check if a file is an image based on extension
 */
function isImageFile(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext && imageExtensions.has(ext);
}

/**
 * Get MIME type from file extension
 */
function getMimeType(path) {
  const ext = path.split('.').pop()?.toLowerCase();
  const mimeTypes = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon',
    'tiff': 'image/tiff',
    'tif': 'image/tiff',
    'avif': 'image/avif',
    'heic': 'image/heic',
    'heif': 'image/heif'
  };
  return mimeTypes[ext] || 'image/png';
}

/**
 * Convert file data to blob URL
 */
function createImageBlob(data, mimeType) {
  let blob;
  if (typeof data === 'string') {
    blob = new Blob([data], { type: mimeType });
  } else if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
    blob = new Blob([data], { type: mimeType });
  } else if (data && typeof data === 'object') {
    const bytes = data.buffer instanceof ArrayBuffer
      ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      : new Uint8Array(data);
    blob = new Blob([bytes], { type: mimeType });
  } else {
    blob = new Blob([data], { type: mimeType });
  }
  return URL.createObjectURL(blob);
}

function ImageViewerApp({ host }) {
  // State
  const isOpen = useSignal(false);
  const currentPath = useSignal('');
  const currentIndex = useSignal(0);
  const imageList = useSignal([]);
  const zoom = useSignal(1);
  const imageOffset = useSignal({ x: 0, y: 0 });
  const isLoading = useSignal(false);
  const isDragging = useSignal(false);
  const dragStart = useSignal({ x: 0, y: 0 });
  const imageUrl = useSignal('');
  const imageInfo = useSignal({ width: 0, height: 0 });
  const errorMessage = useSignal('');
  const showEmpty = useSignal(false);

  // Touch state
  const isPinching = useSignal(false);
  const lastPinchDistance = useSignal(0);

  // Refs
  const imageContainerRef = useRef(null);
  const imageElementRef = useRef(null);

  // Constants
  const minZoom = 0.25;
  const maxZoom = 5;

  // Computed values
  const title = useComputed(() => {
    if (showEmpty.value) return 'Images';
    return currentPath.value.split('/').pop() || 'Image';
  });

  const counter = useComputed(() => {
    if (imageList.value.length <= 1) return '';
    return `${currentIndex.value + 1} / ${imageList.value.length}`;
  });

  const imageInfoText = useComputed(() => {
    if (!imageInfo.value.width) return '';
    const { width, height } = imageInfo.value;
    const ext = currentPath.value.split('.').pop()?.toUpperCase() || 'IMG';
    return `${width} × ${height} • ${ext}`;
  });

  const zoomPercentage = useComputed(() => `${Math.round(zoom.value * 100)}%`);

  const canGoPrev = useComputed(() => imageList.value.length > 1 && currentIndex.value > 0);
  const canGoNext = useComputed(() => imageList.value.length > 1 && currentIndex.value < imageList.value.length - 1);

  const imageTransform = useComputed(() =>
    `translate(${imageOffset.value.x}px, ${imageOffset.value.y}px) scale(${zoom.value})`
  );

  // Load image list from directory
  const loadImageList = async (path) => {
    try {
      const dirPath = path.substring(0, path.lastIndexOf('/')) || '/';

      await agentfs.init();
      const entries = await agentfs.readdir(dirPath);

      // Filter to only image files
      const images = entries
        .filter(name => isImageFile(name))
        .map(name => dirPath === '/' ? `/${name}` : `${dirPath}/${name}`)
        .sort();

      imageList.value = images;

      // Find current index
      const idx = images.indexOf(path);
      currentIndex.value = idx !== -1 ? idx : 0;
    } catch (err) {
      console.error('[ImageViewer] Failed to load image list:', err);
      imageList.value = [path];
      currentIndex.value = 0;
    }
  };

  // Load and display an image
  const loadImage = async (path) => {
    if (!path) return;

    isLoading.value = true;
    errorMessage.value = '';
    showEmpty.value = false;

    try {
      // Revoke previous blob URL
      if (imageUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl.value);
      }

      // Get file data from AgentFS
      await agentfs.init();
      const data = await agentfs.readFile(path);

      if (!data) {
        throw new Error('File not found or empty');
      }

      // Create blob URL
      const mimeType = getMimeType(path);
      const url = createImageBlob(data, mimeType);

      // Load image
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          imageInfo.value = { width: img.naturalWidth, height: img.naturalHeight };
          resolve();
        };
        img.onerror = reject;
        img.src = url;
      });

      imageUrl.value = url;
      currentPath.value = path;

      // Reset zoom
      zoom.value = 1;
      imageOffset.value = { x: 0, y: 0 };

      appContext.recordAction('image-viewer', 'open', { path });

    } catch (err) {
      console.error('[ImageViewer] Failed to load image:', err);
      errorMessage.value = 'Failed to load image';
    } finally {
      isLoading.value = false;
    }
  };

  // Show app
  const showApp = async (path) => {
    isOpen.value = true;
    host.setAttribute('open', '');

    if (path) {
      await loadImageList(path);
      await loadImage(path);
    } else {
      showEmpty.value = true;
    }

    host.dispatchEvent(new CustomEvent('image-viewer-open', {
      bubbles: true,
      detail: { path }
    }));
  };

  // Hide app
  const hideApp = () => {
    isOpen.value = false;
    host.removeAttribute('open');

    // Revoke blob URL
    if (imageUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl.value);
    }
    imageUrl.value = '';

    host.dispatchEvent(new CustomEvent('image-viewer-close', { bubbles: true }));
  };

  // Navigation handlers
  const handleClose = () => {
    systemSounds.close();
    navigationService.close();
  };

  const navigatePrev = async () => {
    if (!canGoPrev.value) return;
    systemSounds.select();
    currentIndex.value--;
    await loadImage(imageList.value[currentIndex.value]);
  };

  const navigateNext = async () => {
    if (!canGoNext.value) return;
    systemSounds.select();
    currentIndex.value++;
    await loadImage(imageList.value[currentIndex.value]);
  };

  // Zoom handlers
  const zoomIn = () => {
    zoom.value = Math.min(maxZoom, zoom.value * 1.5);
    systemSounds.zoomIn();
  };

  const zoomOut = () => {
    zoom.value = Math.max(minZoom, zoom.value / 1.5);
    systemSounds.zoomOut();
  };

  const zoomReset = () => {
    zoom.value = 1;
    imageOffset.value = { x: 0, y: 0 };
  };

  // Wheel zoom handler
  const handleWheel = (e) => {
    e.preventDefault();

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom.value * delta));

    // Zoom towards cursor position
    if (imageContainerRef.current) {
      const rect = imageContainerRef.current.getBoundingClientRect();
      const cursorX = e.clientX - rect.left - rect.width / 2;
      const cursorY = e.clientY - rect.top - rect.height / 2;

      const scale = newZoom / zoom.value;
      const offset = imageOffset.value;
      imageOffset.value = {
        x: cursorX - (cursorX - offset.x) * scale,
        y: cursorY - (cursorY - offset.y) * scale
      };
    }

    zoom.value = newZoom;
  };

  // Mouse drag handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    isDragging.value = true;
    const offset = imageOffset.value;
    dragStart.value = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging.value) return;
    const start = dragStart.value;
    imageOffset.value = {
      x: e.clientX - start.x,
      y: e.clientY - start.y
    };
  };

  const handleMouseUp = () => {
    isDragging.value = false;
  };

  // Touch handlers
  const getTouchDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      isPinching.value = true;
      lastPinchDistance.value = getTouchDistance(e.touches);
    } else if (e.touches.length === 1) {
      isDragging.value = true;
      const offset = imageOffset.value;
      dragStart.value = {
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y
      };
    }
  };

  const handleTouchMove = (e) => {
    if (isPinching.value && e.touches.length === 2) {
      e.preventDefault();
      const distance = getTouchDistance(e.touches);
      const scale = distance / lastPinchDistance.value;
      zoom.value = Math.max(minZoom, Math.min(maxZoom, zoom.value * scale));
      lastPinchDistance.value = distance;
    } else if (isDragging.value && e.touches.length === 1) {
      e.preventDefault();
      const start = dragStart.value;
      imageOffset.value = {
        x: e.touches[0].clientX - start.x,
        y: e.touches[0].clientY - start.y
      };
    }
  };

  const handleTouchEnd = () => {
    isPinching.value = false;
    isDragging.value = false;
    lastPinchDistance.value = 0;
  };

  // Double-click to toggle zoom
  const handleDoubleClick = (e) => {
    if (zoom.value === 1) {
      // Zoom in to 2x centered on click
      const rect = imageContainerRef.current?.getBoundingClientRect();
      if (rect) {
        const cursorX = e.clientX - rect.left - rect.width / 2;
        const cursorY = e.clientY - rect.top - rect.height / 2;

        zoom.value = 2;
        imageOffset.value = { x: -cursorX, y: -cursorY };
      }
    } else {
      // Reset zoom
      zoomReset();
    }
  };

  // Keyboard handler
  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'Escape':
        handleClose();
        break;
      case 'ArrowLeft':
        navigatePrev();
        break;
      case 'ArrowRight':
        navigateNext();
        break;
      case '+':
      case '=':
        zoomIn();
        break;
      case '-':
        zoomOut();
        break;
      case '0':
        zoomReset();
        break;
    }
  };

  // Subscribe to navigation service
  useEffect(() => {
    const unsubscribe = navigationService.subscribe((snapshot) => {
      const { current } = snapshot.context;
      const isViewerActive = current?.id === 'image-viewer';

      if (isViewerActive && !isOpen.value) {
        const path = current.state?.path;
        showApp(path);
      } else if (!isViewerActive && isOpen.value) {
        hideApp();
      }
    });

    return () => unsubscribe();
  }, []);

  // Keyboard event listener
  useEffect(() => {
    if (isOpen.value) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen.value]);

  // Expose public API
  host.open = (path) => {
    systemSounds.open();
    const fileName = path ? path.split('/').pop() : 'Image';
    navigationService.push('image-viewer', fileName, { path });
  };

  host.close = handleClose;

  host.isOpen = isOpen.value;
  host.currentPath = currentPath.value;

  // Render
  return html`
    <${ErrorBoundary} name="ImageViewerApp">
      <div class="header">
        <div class="header-left">
          <span class="title">${title}</span>
        </div>
        <div class="header-center">
          ${imageInfoText.value && html`<span class="image-info">${imageInfoText}</span>`}
          ${counter.value && html`<span class="counter">${counter}</span>`}
        </div>
        <div class="header-right">
          <button
            class="close-btn"
            type="button"
            onClick=${handleClose}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref=${imageContainerRef}
        class=${`image-container ${isLoading.value ? 'loading' : ''} ${isDragging.value ? 'dragging' : ''}`}
        onWheel=${handleWheel}
        onMouseDown=${handleMouseDown}
        onMouseMove=${handleMouseMove}
        onMouseUp=${handleMouseUp}
        onMouseLeave=${handleMouseUp}
        onTouchStart=${handleTouchStart}
        onTouchMove=${handleTouchMove}
        onTouchEnd=${handleTouchEnd}
        onDblClick=${handleDoubleClick}
      >
        ${imageUrl.value && !errorMessage.value && !showEmpty.value && html`
          <img
            ref=${imageElementRef}
            class="image-display"
            src=${imageUrl.value}
            alt=${title}
            style=${{ transform: imageTransform.value }}
          />
        `}

        ${errorMessage.value && html`
          <div class="error-state">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>${errorMessage}</span>
          </div>
        `}

        ${showEmpty.value && html`
          <div class="empty-state">
            <svg viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>open an image from files</span>
          </div>
        `}

        ${isLoading.value && html`
          <div class="loading-overlay">
            <div class="loading-spinner"></div>
          </div>
        `}

        ${!showEmpty.value && imageList.value.length > 1 && html`
          <div class="nav-overlay left">
            <button
              class="nav-btn prev-btn"
              type="button"
              disabled=${!canGoPrev.value}
              onClick=${navigatePrev}
              aria-label="Previous image"
            >
              <svg viewBox="0 0 24 24" fill="none">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>

          <div class="nav-overlay right">
            <button
              class="nav-btn next-btn"
              type="button"
              disabled=${!canGoNext.value}
              onClick=${navigateNext}
              aria-label="Next image"
            >
              <svg viewBox="0 0 24 24" fill="none">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        `}
      </div>

      <div class="footer">
        <div class="zoom-controls">
          <button
            class="zoom-btn zoom-out-btn"
            type="button"
            onClick=${zoomOut}
            disabled=${zoom.value <= minZoom}
            aria-label="Zoom out"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" />
              <line x1="8" y1="11" x2="14" y2="11" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          <button
            class="zoom-btn zoom-reset-btn"
            type="button"
            onClick=${zoomReset}
            aria-label="Reset zoom"
          >
            ${zoomPercentage}
          </button>

          <button
            class="zoom-btn zoom-in-btn"
            type="button"
            onClick=${zoomIn}
            disabled=${zoom.value >= maxZoom}
            aria-label="Zoom in"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>
      </div>
    <//>
  `;
}

export default createShadowComponent(ImageViewerApp, {
  tag: 'image-viewer-app',
  styleUrl: './src/components/styles/image-viewer-app.css',
});
