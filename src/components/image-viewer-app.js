/**
 * Image Viewer App Component
 * Elegant gallery for viewing image files with zoom and navigation
 * 
 * Now integrates with XState navigation service for window management
 */

import { agentfs, appContext, systemSounds, navigationService } from '../services/index.js';

export class ImageViewerApp extends HTMLElement {
  // DOM Elements
  #closeBtn = null;
  #prevBtn = null;
  #nextBtn = null;
  #zoomInBtn = null;
  #zoomOutBtn = null;
  #zoomResetBtn = null;
  #imageContainer = null;
  #imageElement = null;
  #titleElement = null;
  #infoElement = null;
  #counterElement = null;
  #boundHandleKeyDown = null;
  
  // State
  #currentPath = '';
  #currentIndex = 0;
  #imageList = [];
  #zoom = 1;
  #minZoom = 0.25;
  #maxZoom = 5;
  #isLoading = false;
  #isDragging = false;
  #dragStart = { x: 0, y: 0 };
  #imageOffset = { x: 0, y: 0 };
  #lastPinchDistance = 0;
  #isPinching = false;

  /**
   * Supported image extensions
   */
  static imageExtensions = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 
    'bmp', 'ico', 'tiff', 'tif', 'avif', 'heic', 'heif'
  ]);

  /**
   * Check if a file is an image based on extension
   */
  static isImageFile(filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext && ImageViewerApp.imageExtensions.has(ext);
  }

  // Navigation subscription
  #unsubscribeNav = null;

  connectedCallback() {
    this.#closeBtn = this.shadowRoot?.querySelector('.close-btn');
    this.#prevBtn = this.shadowRoot?.querySelector('.prev-btn');
    this.#nextBtn = this.shadowRoot?.querySelector('.next-btn');
    this.#zoomInBtn = this.shadowRoot?.querySelector('.zoom-in-btn');
    this.#zoomOutBtn = this.shadowRoot?.querySelector('.zoom-out-btn');
    this.#zoomResetBtn = this.shadowRoot?.querySelector('.zoom-reset-btn');
    this.#imageContainer = this.shadowRoot?.querySelector('.image-container');
    this.#imageElement = this.shadowRoot?.querySelector('.image-display');
    this.#titleElement = this.shadowRoot?.querySelector('.title');
    this.#infoElement = this.shadowRoot?.querySelector('.image-info');
    this.#counterElement = this.shadowRoot?.querySelector('.counter');
    
    // Event handlers
    this.#closeBtn?.addEventListener('click', () => this.close());
    this.#prevBtn?.addEventListener('click', () => this.#navigatePrev());
    this.#nextBtn?.addEventListener('click', () => this.#navigateNext());
    this.#zoomInBtn?.addEventListener('click', () => this.#zoomIn());
    this.#zoomOutBtn?.addEventListener('click', () => this.#zoomOut());
    this.#zoomResetBtn?.addEventListener('click', () => this.#zoomReset());
    
    // Keyboard handler
    this.#boundHandleKeyDown = this.#handleKeyDown.bind(this);
    
    // Wheel zoom
    this.#imageContainer?.addEventListener('wheel', (e) => this.#handleWheel(e), { passive: false });
    
    // Pan/drag
    this.#imageContainer?.addEventListener('mousedown', (e) => this.#handleMouseDown(e));
    this.#imageContainer?.addEventListener('mousemove', (e) => this.#handleMouseMove(e));
    this.#imageContainer?.addEventListener('mouseup', () => this.#handleMouseUp());
    this.#imageContainer?.addEventListener('mouseleave', () => this.#handleMouseUp());
    
    // Touch gestures
    this.#imageContainer?.addEventListener('touchstart', (e) => this.#handleTouchStart(e), { passive: false });
    this.#imageContainer?.addEventListener('touchmove', (e) => this.#handleTouchMove(e), { passive: false });
    this.#imageContainer?.addEventListener('touchend', () => this.#handleTouchEnd());
    
    // Double-click to zoom
    this.#imageContainer?.addEventListener('dblclick', (e) => this.#handleDoubleClick(e));
    
    // Subscribe to navigation state
    this.#subscribeToNavigation();
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this.#boundHandleKeyDown);
    if (this.#unsubscribeNav) {
      this.#unsubscribeNav();
      this.#unsubscribeNav = null;
    }
  }

  /**
   * Subscribe to navigation service state changes
   */
  #subscribeToNavigation() {
    this.#unsubscribeNav = navigationService.subscribe((snapshot) => {
      const { current } = snapshot.context;
      const isViewerActive = current?.id === 'image-viewer';
      
      if (isViewerActive && !this.hasAttribute('open')) {
        const path = current.state?.path;
        this.#showApp(path);
      } else if (!isViewerActive && this.hasAttribute('open')) {
        this.#hideApp();
      }
    });
  }

  /**
   * Show the app (internal - called by navigation subscription)
   */
  async #showApp(path) {
    this.setAttribute('open', '');
    document.addEventListener('keydown', this.#boundHandleKeyDown);

    this.#zoom = 1;
    this.#imageOffset = { x: 0, y: 0 };

    if (path) {
      this.#currentPath = path;
      await this.#loadImageList();
      await this.#loadImage(path);
      appContext.recordAction('image-viewer', 'open', { path });
    } else {
      this.#showEmptyState();
    }

    this.dispatchEvent(new CustomEvent('image-viewer-open', { bubbles: true, detail: { path } }));
  }

  /**
   * Hide the app (internal - called by navigation subscription)
   */
  #hideApp() {
    this.removeAttribute('open');
    document.removeEventListener('keydown', this.#boundHandleKeyDown);

    if (this.#imageElement) {
      this.#imageElement.src = '';
    }

    this.dispatchEvent(new CustomEvent('image-viewer-close', { bubbles: true }));
  }

  /**
   * Open the image viewer with a specific image (public API - uses navigation service)
   * @param {string} [path] - Path to the image file
   */
  open(path) {
    systemSounds.open();
    const fileName = path ? path.split('/').pop() : 'Image';
    navigationService.push('image-viewer', fileName, { path });
  }

  /**
   * Close the image viewer (public API - uses navigation service)
   */
  close() {
    systemSounds.close();
    navigationService.close();
  }

  /**
   * Load list of images in the same directory
   */
  async #loadImageList() {
    try {
      const dirPath = this.#currentPath.substring(0, this.#currentPath.lastIndexOf('/')) || '/';
      
      await agentfs.init();
      const entries = await agentfs.readdir(dirPath);
      
      // Filter to only image files
      this.#imageList = entries
        .filter(name => ImageViewerApp.isImageFile(name))
        .map(name => dirPath === '/' ? `/${name}` : `${dirPath}/${name}`)
        .sort();
      
      // Find current index
      this.#currentIndex = this.#imageList.indexOf(this.#currentPath);
      if (this.#currentIndex === -1) this.#currentIndex = 0;
      
      this.#updateCounter();
      this.#updateNavButtons();
    } catch (err) {
      console.error('[ImageViewer] Failed to load image list:', err);
      this.#imageList = [this.#currentPath];
      this.#currentIndex = 0;
    }
  }

  /**
   * Load and display an image
   */
  async #loadImage(path) {
    if (!this.#imageElement || !this.#imageContainer) return;
    
    this.#isLoading = true;
    this.#imageContainer.classList.add('loading');
    
    try {
      // Get file data from AgentFS
      await agentfs.init();
      const data = await agentfs.readFile(path);
      
      // Debug: log what we got back
      console.log('[ImageViewer] Data type:', typeof data, data?.constructor?.name);
      console.log('[ImageViewer] Data length:', data?.length || data?.byteLength);
      if (data && typeof data === 'object') {
        console.log('[ImageViewer] Has buffer:', !!data.buffer, 'byteOffset:', data.byteOffset, 'byteLength:', data.byteLength);
      }
      
      if (!data) {
        throw new Error('File not found or empty');
      }
      
      // Determine MIME type from extension
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
      
      const mimeType = mimeTypes[ext] || 'image/png';
      
      // Convert to blob URL
      let blob;
      if (typeof data === 'string') {
        // For SVG or text-based formats
        blob = new Blob([data], { type: mimeType });
      } else if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
        blob = new Blob([data], { type: mimeType });
      } else if (data && typeof data === 'object') {
        // Handle Buffer objects (from AgentFS/buffer polyfill)
        // Buffer has a .buffer property (ArrayBuffer) or can be converted to Uint8Array
        const bytes = data.buffer instanceof ArrayBuffer 
          ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
          : new Uint8Array(data);
        blob = new Blob([bytes], { type: mimeType });
      } else {
        // Fallback - try to use as-is
        blob = new Blob([data], { type: mimeType });
      }
      
      const url = URL.createObjectURL(blob);
      
      // Revoke previous URL
      if (this.#imageElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.#imageElement.src);
      }
      
      // Load image
      await new Promise((resolve, reject) => {
        this.#imageElement.onload = resolve;
        this.#imageElement.onerror = reject;
        this.#imageElement.src = url;
      });
      
      // Update UI
      this.#currentPath = path;
      this.#updateTitle();
      this.#updateInfo();
      this.#zoomReset();
      
    } catch (err) {
      console.error('[ImageViewer] Failed to load image:', err);
      this.#showError('Failed to load image');
    } finally {
      this.#isLoading = false;
      this.#imageContainer.classList.remove('loading');
    }
  }

  /**
   * Navigate to previous image
   */
  async #navigatePrev() {
    if (this.#imageList.length <= 1 || this.#currentIndex <= 0) return;
    
    systemSounds.select();
    this.#currentIndex--;
    await this.#loadImage(this.#imageList[this.#currentIndex]);
    this.#updateCounter();
    this.#updateNavButtons();
  }

  /**
   * Navigate to next image
   */
  async #navigateNext() {
    if (this.#imageList.length <= 1 || this.#currentIndex >= this.#imageList.length - 1) return;
    
    systemSounds.select();
    this.#currentIndex++;
    await this.#loadImage(this.#imageList[this.#currentIndex]);
    this.#updateCounter();
    this.#updateNavButtons();
  }

  /**
   * Zoom in
   */
  #zoomIn() {
    this.#zoom = Math.min(this.#maxZoom, this.#zoom * 1.5);
    this.#applyTransform();
    systemSounds.zoomIn();
  }

  /**
   * Zoom out
   */
  #zoomOut() {
    this.#zoom = Math.max(this.#minZoom, this.#zoom / 1.5);
    this.#applyTransform();
    systemSounds.zoomOut();
  }

  /**
   * Reset zoom to fit
   */
  #zoomReset() {
    this.#zoom = 1;
    this.#imageOffset = { x: 0, y: 0 };
    this.#applyTransform();
  }

  /**
   * Apply current transform
   */
  #applyTransform() {
    if (!this.#imageElement) return;
    this.#imageElement.style.transform = `translate(${this.#imageOffset.x}px, ${this.#imageOffset.y}px) scale(${this.#zoom})`;
    
    // Update zoom button states
    if (this.#zoomResetBtn) {
      this.#zoomResetBtn.textContent = `${Math.round(this.#zoom * 100)}%`;
    }
  }

  /**
   * Handle wheel zoom
   */
  #handleWheel(e) {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(this.#minZoom, Math.min(this.#maxZoom, this.#zoom * delta));
    
    // Zoom towards cursor position
    if (this.#imageContainer && this.#imageElement) {
      const rect = this.#imageContainer.getBoundingClientRect();
      const cursorX = e.clientX - rect.left - rect.width / 2;
      const cursorY = e.clientY - rect.top - rect.height / 2;
      
      const scale = newZoom / this.#zoom;
      this.#imageOffset.x = cursorX - (cursorX - this.#imageOffset.x) * scale;
      this.#imageOffset.y = cursorY - (cursorY - this.#imageOffset.y) * scale;
    }
    
    this.#zoom = newZoom;
    this.#applyTransform();
  }

  /**
   * Handle mouse down for panning
   */
  #handleMouseDown(e) {
    if (e.button !== 0) return;
    this.#isDragging = true;
    this.#dragStart = { x: e.clientX - this.#imageOffset.x, y: e.clientY - this.#imageOffset.y };
    this.#imageContainer?.classList.add('dragging');
  }

  /**
   * Handle mouse move for panning
   */
  #handleMouseMove(e) {
    if (!this.#isDragging) return;
    this.#imageOffset = {
      x: e.clientX - this.#dragStart.x,
      y: e.clientY - this.#dragStart.y
    };
    this.#applyTransform();
  }

  /**
   * Handle mouse up
   */
  #handleMouseUp() {
    this.#isDragging = false;
    this.#imageContainer?.classList.remove('dragging');
  }

  /**
   * Handle touch start
   */
  #handleTouchStart(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      this.#isPinching = true;
      this.#lastPinchDistance = this.#getTouchDistance(e.touches);
    } else if (e.touches.length === 1) {
      this.#isDragging = true;
      this.#dragStart = {
        x: e.touches[0].clientX - this.#imageOffset.x,
        y: e.touches[0].clientY - this.#imageOffset.y
      };
    }
  }

  /**
   * Handle touch move
   */
  #handleTouchMove(e) {
    if (this.#isPinching && e.touches.length === 2) {
      e.preventDefault();
      const distance = this.#getTouchDistance(e.touches);
      const scale = distance / this.#lastPinchDistance;
      this.#zoom = Math.max(this.#minZoom, Math.min(this.#maxZoom, this.#zoom * scale));
      this.#lastPinchDistance = distance;
      this.#applyTransform();
    } else if (this.#isDragging && e.touches.length === 1) {
      e.preventDefault();
      this.#imageOffset = {
        x: e.touches[0].clientX - this.#dragStart.x,
        y: e.touches[0].clientY - this.#dragStart.y
      };
      this.#applyTransform();
    }
  }

  /**
   * Handle touch end
   */
  #handleTouchEnd() {
    this.#isPinching = false;
    this.#isDragging = false;
    this.#lastPinchDistance = 0;
  }

  /**
   * Get distance between two touch points
   */
  #getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Handle double-click to toggle zoom
   */
  #handleDoubleClick(e) {
    if (this.#zoom === 1) {
      // Zoom in to 2x centered on click
      const rect = this.#imageContainer.getBoundingClientRect();
      const cursorX = e.clientX - rect.left - rect.width / 2;
      const cursorY = e.clientY - rect.top - rect.height / 2;
      
      this.#zoom = 2;
      this.#imageOffset = { x: -cursorX, y: -cursorY };
    } else {
      // Reset zoom
      this.#zoom = 1;
      this.#imageOffset = { x: 0, y: 0 };
    }
    this.#applyTransform();
  }

  /**
   * Handle keyboard events
   */
  #handleKeyDown(e) {
    switch (e.key) {
      case 'Escape':
        this.close();
        break;
      case 'ArrowLeft':
        this.#navigatePrev();
        break;
      case 'ArrowRight':
        this.#navigateNext();
        break;
      case '+':
      case '=':
        this.#zoomIn();
        break;
      case '-':
        this.#zoomOut();
        break;
      case '0':
        this.#zoomReset();
        break;
    }
  }

  /**
   * Update title display
   */
  #updateTitle() {
    if (!this.#titleElement) return;
    const filename = this.#currentPath.split('/').pop() || 'Image';
    this.#titleElement.textContent = filename;
  }

  /**
   * Update image info display
   */
  #updateInfo() {
    if (!this.#infoElement || !this.#imageElement) return;
    
    const width = this.#imageElement.naturalWidth;
    const height = this.#imageElement.naturalHeight;
    const ext = this.#currentPath.split('.').pop()?.toUpperCase() || 'IMG';
    
    this.#infoElement.textContent = `${width} × ${height} • ${ext}`;
  }

  /**
   * Update counter display
   */
  #updateCounter() {
    if (!this.#counterElement) return;
    
    if (this.#imageList.length > 1) {
      this.#counterElement.textContent = `${this.#currentIndex + 1} / ${this.#imageList.length}`;
      this.#counterElement.style.display = '';
    } else {
      this.#counterElement.style.display = 'none';
    }
  }

  /**
   * Update navigation button states
   */
  #updateNavButtons() {
    if (this.#prevBtn) {
      this.#prevBtn.disabled = this.#currentIndex <= 0;
    }
    if (this.#nextBtn) {
      this.#nextBtn.disabled = this.#currentIndex >= this.#imageList.length - 1;
    }
  }

  /**
   * Show error state
   */
  #showError(message) {
    if (!this.#imageContainer) return;
    
    this.#imageContainer.innerHTML = `
      <div class="error-state">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>${message}</span>
      </div>
    `;
  }

  /**
   * Show empty state (no image selected)
   */
  #showEmptyState() {
    if (!this.#imageContainer) return;
    
    // Update title
    if (this.#titleElement) {
      this.#titleElement.textContent = 'Images';
    }
    if (this.#infoElement) {
      this.#infoElement.textContent = '';
    }
    if (this.#counterElement) {
      this.#counterElement.style.display = 'none';
    }
    
    // Hide nav buttons
    if (this.#prevBtn) this.#prevBtn.disabled = true;
    if (this.#nextBtn) this.#nextBtn.disabled = true;
    
    // Clear image
    if (this.#imageElement) {
      this.#imageElement.src = '';
      this.#imageElement.style.display = 'none';
    }
    
    // Show message
    const existingEmpty = this.#imageContainer.querySelector('.empty-state');
    if (existingEmpty) existingEmpty.remove();
    
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <svg viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      <span>open an image from files</span>
    `;
    this.#imageContainer.appendChild(emptyState);
  }

  /**
   * Get current path
   */
  get currentPath() {
    return this.#currentPath;
  }

  /**
   * Check if open
   */
  get isOpen() {
    return this.hasAttribute('open');
  }
}

customElements.define('image-viewer-app', ImageViewerApp);
