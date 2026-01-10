/**
 * Files App Component
 * Spatial file browser with canvas-based layout
 */
import { html } from 'htm/preact';
import { signal, computed, effect } from '@preact/signals';
import { useSignal, useComputed, useSignalEffect } from '@preact/signals';
import { useRef, useEffect } from 'preact/hooks';
import { createShadowComponent } from '../lib/shadow-component.js';
import { ErrorBoundary } from '../lib/error-boundary.js';
import { navigate, canGoBack, canGoForward } from '../services/navigation-signals.js';
import { agentfs, appContext, systemSounds, navigationService } from '../services/index.js';

const styles = `
/* Files App - Elegant Spatial Interface */
/* Terracotta background matching the home aesthetic */

:host {
  position: fixed;
  inset: 0;
  z-index: 900;
  display: flex;
  flex-direction: column;
  background: var(--color-red, oklch(0.55 0.155 25));
  opacity: 0;
  visibility: hidden;
  transform: scale(0.95);
  transition: opacity 0.4s ease, visibility 0.4s ease, transform 0.4s ease;
  dynamic-range-limit: no-limit;
}

:host([open]) {
  opacity: 1;
  visibility: visible;
  transform: scale(1);
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid oklch(1 0 0 / 0.12);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

/* Elegant pill buttons */
.back-btn,
.forward-btn,
.close-btn {
  background: transparent;
  border: 1px solid oklch(1 0 0 / 0.35);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg, 30px);
  transition: all 0.15s ease;
  padding: 0.5rem 1rem;
  gap: 0.5rem;
}

.back-btn,
.forward-btn {
  padding: 0.5rem;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
}

.close-btn {
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border-radius: 50%;
}

.back-btn:hover,
.forward-btn:hover,
.close-btn:hover {
  border-color: oklch(1 0 0 / 0.7);
  background: oklch(1 0 0 / 0.1);
  transform: scale(1.02);
}

.back-btn:active,
.forward-btn:active,
.close-btn:active {
  transform: scale(0.96);
  transition: transform 0.08s ease;
}

.back-btn:disabled,
.forward-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.back-btn svg,
.forward-btn svg,
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
.forward-btn:hover svg,
.close-btn:hover svg {
  stroke: oklch(1 0 0 / 0.95);
}

.back-btn-text {
  font-family: var(--font-body, 'Cormorant Garamond', serif);
  font-size: 0.85rem;
  font-style: italic;
  color: oklch(1 0 0 / 0.6);
  letter-spacing: 0.08em;
  transition: color 0.15s ease;
}

.back-btn:hover .back-btn-text {
  color: oklch(1 0 0 / 0.95);
}

.title {
  font-family: var(--font-body, 'Cormorant Garamond', serif);
  font-style: italic;
  font-size: 1.15rem;
  font-weight: 400;
  color: oklch(1 0 0 / 0.85);
  letter-spacing: 0.08em;
}

/* Path breadcrumb - elegant serif style */
.path {
  font-family: var(--font-body, 'Cormorant Garamond', serif);
  font-size: 0.8rem;
  font-style: italic;
  color: oklch(1 0 0 / 0.5);
  letter-spacing: 0.06em;
}

.path-segment {
  cursor: pointer;
  transition: color 0.15s ease;
}

.path-segment:hover {
  color: oklch(1 0 0 / 0.95);
}

.path-separator {
  margin: 0 0.4rem;
  opacity: 0.4;
}

/* Spatial Canvas Container */
.canvas-container {
  flex: 1;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  touch-action: pan-y pinch-zoom;
  pointer-events: auto;

  /* Auto-hide scrollbar - only show when scrolling/hovering */
  scrollbar-width: none; /* Firefox: hide by default */
  scrollbar-gutter: stable;
}

/* Show scrollbar on hover/interaction */
.canvas-container:hover,
.canvas-container:focus-within {
  scrollbar-width: thin;
  scrollbar-color: oklch(1 0 0 / 0.2) transparent;
}

/* Webkit auto-hide scrollbar */
.canvas-container::-webkit-scrollbar {
  width: 6px;
}

.canvas-container::-webkit-scrollbar-track {
  background: transparent;
}

.canvas-container::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 3px;
  transition: background 0.3s ease;
}

.canvas-container:hover::-webkit-scrollbar-thumb,
.canvas-container:active::-webkit-scrollbar-thumb {
  background: oklch(1 0 0 / 0.2);
}

.canvas-container::-webkit-scrollbar-thumb:hover {
  background: oklch(1 0 0 / 0.35);
}

/* Canvas - zoomable grid area */
.canvas {
  min-height: 100%;
  transform-origin: top center;
  transition: transform 0.3s ease;
  will-change: transform;
  pointer-events: auto;

  /* Modern CSS Grid - auto-fit responsive columns */
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 2rem;
  padding: 2.5rem;
  align-content: start;
  justify-items: center;
}

/* File/Folder Node - minimal style */
.node {
  display: grid;
  place-items: center;
  gap: 0.75rem;
  padding: 1.25rem;
  border-radius: var(--radius-md, 20px);
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
  width: 100%;
  max-width: 140px;
  aspect-ratio: 1 / 1.1;
  opacity: 0;
  animation: node-appear 0.5s ease forwards;
  pointer-events: auto;
}

@keyframes node-appear {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Staggered appearance */
.node:nth-child(1) { animation-delay: 0.05s; }
.node:nth-child(2) { animation-delay: 0.1s; }
.node:nth-child(3) { animation-delay: 0.15s; }
.node:nth-child(4) { animation-delay: 0.2s; }
.node:nth-child(5) { animation-delay: 0.25s; }
.node:nth-child(6) { animation-delay: 0.3s; }
.node:nth-child(7) { animation-delay: 0.35s; }
.node:nth-child(8) { animation-delay: 0.4s; }
.node:nth-child(9) { animation-delay: 0.45s; }
.node:nth-child(10) { animation-delay: 0.5s; }

.node:hover {
  background: oklch(1 0 0 / 0.08);
  transform: scale(1.05);
}

.node:active {
  transform: scale(0.98);
  transition: transform 0.08s ease;
}

/* Node Icon - NO border, just the beautiful vector icon */
.node-icon {
  width: 4.5rem;
  height: 4.5rem;
  display: grid;
  place-items: center;
  transition: transform 0.2s ease;
}

.node:hover .node-icon {
  transform: scale(1.08);
}

.node-icon svg {
  width: 2.75rem;
  height: 2.75rem;
  stroke: oklch(1 0 0 / 0.75);
  stroke-width: 1.25;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: stroke 0.2s ease;
}

.node:hover .node-icon svg {
  stroke: oklch(1 0 0);
}

/* Folder specific - slightly warmer tint */
.node[data-type="folder"] .node-icon svg {
  stroke: oklch(0.95 0.05 70 / 0.9);
}

.node[data-type="folder"]:hover .node-icon svg {
  stroke: oklch(1 0.03 70);
}

/* Node Name - elegant serif */
.node-name {
  font-family: var(--font-body, 'Cormorant Garamond', serif);
  font-size: 1rem;
  font-style: italic;
  color: oklch(1 0 0 / 0.7);
  max-width: 130px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0.04em;
  transition: color 0.2s ease;
}

.node:hover .node-name {
  color: oklch(1 0 0 / 0.95);
}

/* Empty State */
.empty-state {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  gap: 1.5rem;
  justify-items: center;
  color: oklch(1 0 0 / 0.4);
  pointer-events: none;
}

.empty-state svg {
  width: 3rem;
  height: 3rem;
  stroke: currentColor;
  stroke-width: 1;
  fill: none;
  opacity: 0.6;
}

.empty-state-text {
  font-family: var(--font-body, 'Cormorant Garamond', serif);
  font-style: italic;
  font-size: 1.1rem;
  letter-spacing: 0.08em;
}

/* Loading State */
.loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.loading-spinner {
  width: 1.5rem;
  height: 1.5rem;
  border: 1px solid oklch(1 0 0 / 0.2);
  border-top-color: oklch(1 0 0 / 0.8);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Time Scrubber (bottom bar) */
.time-scrubber {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem 2rem;
  border-top: 1px solid oklch(1 0 0 / 0.12);
  flex-shrink: 0;
}

.time-label {
  font-family: var(--font-body, 'Cormorant Garamond', serif);
  font-size: 0.75rem;
  font-style: italic;
  color: oklch(1 0 0 / 0.5);
  letter-spacing: 0.08em;
  min-width: 50px;
}

.time-slider {
  flex: 1;
  height: 2px;
  background: oklch(1 0 0 / 0.15);
  border-radius: 1px;
  cursor: pointer;
  position: relative;
}

.time-slider-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: oklch(1 0 0 / 0.6);
  border-radius: 1px;
  width: 100%;
  transition: width 0.2s ease;
}

.time-slider-thumb {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translate(50%, -50%);
  width: 10px;
  height: 10px;
  background: oklch(1 0 0 / 0.9);
  border-radius: 50%;
  box-shadow: 0 0 10px oklch(1 0 0 / 0.3);
}

/* Zoom indicator */
.zoom-indicator {
  position: absolute;
  bottom: 5rem;
  right: 2rem;
  font-family: var(--font-body, 'Cormorant Garamond', serif);
  font-size: 0.75rem;
  font-style: italic;
  color: oklch(1 0 0 / 0.4);
  letter-spacing: 0.08em;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 10;
}

.zoom-indicator.visible {
  opacity: 1;
}

/* Focus states */
.node:focus-visible {
  outline: 1px solid oklch(1 0 0 / 0.6);
  outline-offset: 4px;
}

/* Dragging state */
.node.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

.node[draggable="true"] {
  cursor: grab;
}

.node[draggable="true"]:active {
  cursor: grabbing;
}

/* Context Menu */
.context-menu {
  position: absolute;
  z-index: 1000;
  min-width: 180px;
  background: oklch(0.2 0.02 25 / 0.95);
  border: 1px solid oklch(1 0 0 / 0.15);
  border-radius: var(--radius-md, 16px);
  padding: 0.5rem;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow:
    0 8px 32px oklch(0 0 0 / 0.3),
    0 0 0 1px oklch(1 0 0 / 0.05) inset;
  opacity: 0;
  visibility: hidden;
  transform: scale(0.95) translateY(-8px);
  transform-origin: top left;
  transition:
    opacity 0.2s ease,
    visibility 0.2s ease,
    transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.context-menu.visible {
  opacity: 1;
  visibility: visible;
  transform: scale(1) translateY(0);
  pointer-events: auto;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.65rem 0.85rem;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm, 10px);
  cursor: pointer;
  font-family: var(--font-body, 'Cormorant Garamond', serif);
  font-size: 0.95rem;
  font-style: italic;
  color: oklch(1 0 0 / 0.8);
  letter-spacing: 0.04em;
  text-align: left;
  transition: background 0.15s ease, color 0.15s ease;
}

.context-menu-item:hover {
  background: oklch(1 0 0 / 0.1);
  color: oklch(1 0 0 / 0.95);
}

.context-menu-item:active {
  background: oklch(1 0 0 / 0.15);
  transform: scale(0.98);
}

.context-menu-item svg {
  width: 1.1rem;
  height: 1.1rem;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
  opacity: 0.7;
  flex-shrink: 0;
}

.context-menu-item:hover svg {
  opacity: 1;
}

.context-menu-separator {
  height: 1px;
  background: oklch(1 0 0 / 0.1);
  margin: 0.4rem 0.5rem;
}

/* Danger action (delete) */
.context-menu-item--danger {
  color: oklch(0.7 0.15 25);
}

.context-menu-item--danger:hover {
  background: oklch(0.7 0.15 25 / 0.15);
  color: oklch(0.8 0.18 25);
}

.context-menu-item--danger svg {
  stroke: currentColor;
}

/* HDR Enhancement */
@media (dynamic-range: high) {
  .back-btn:hover,
  .close-btn:hover {
    border-color: var(--hdr-white-bright, oklch(1.15 0 0));
  }

  .node:hover .node-icon svg {
    stroke: var(--hdr-white-peak, oklch(1.5 0 0));
  }

  .node:hover .node-name {
    color: var(--hdr-white-bright, oklch(1.15 0 0));
  }

  .title {
    color: var(--hdr-white-bright, oklch(1.15 0 0));
  }

  .time-slider-thumb {
    box-shadow: 0 0 15px oklch(1.2 0 0 / 0.4);
  }

  .context-menu-item:hover {
    color: var(--hdr-white-bright, oklch(1.15 0 0));
  }

  .context-menu-item--danger:hover {
    color: oklch(0.9 0.2 25);
  }
}

/* Responsive */
@media (max-width: 700px) {
  .header {
    padding: 1.25rem 1.5rem;
  }

  .canvas {
    grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
    gap: 1.25rem;
    padding: 1.5rem;
  }

  .node {
    max-width: 110px;
    padding: 1rem 0.75rem;
  }

  .node-icon {
    width: 3.5rem;
    height: 3.5rem;
  }

  .node-icon svg {
    width: 2.25rem;
    height: 2.25rem;
  }

  .node-name {
    font-size: 0.9rem;
    max-width: 100px;
  }

  .time-scrubber {
    padding: 1rem 1.5rem;
  }
}

/* Large screens - limit max columns for better readability */
@media (min-width: 1200px) {
  .canvas {
    grid-template-columns: repeat(auto-fit, minmax(140px, 180px));
    justify-content: center;
  }
}
`;

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
  'settings', 'temporary'
]);

// Helper functions for file type detection
function isCodeFile(path) {
  const ext = path.split('.').pop()?.toLowerCase();
  return ext && CODE_EXTENSIONS.has(ext);
}

function isImageFile(path) {
  const ext = path.split('.').pop()?.toLowerCase();
  return ext && IMAGE_EXTENSIONS.has(ext);
}

function isDirectory(path) {
  return agentfs.getAgent().then(agent =>
    agent.fs.stat(path).then(stats => stats.isDirectory()).catch(() => false)
  );
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
      const entries = await agentfs.readdir(currentPath.value);

      const fileList = await Promise.all(
        entries.map(async (name) => {
          const fullPath = currentPath.value === '/'
            ? `/${name}`
            : `${currentPath.value}/${name}`;

          try {
            const isDir = await isDirectory(fullPath);
            return {
              name,
              path: fullPath,
              type: isDir ? 'folder' : 'file'
            };
          } catch {
            return {
              name,
              path: fullPath,
              type: 'file'
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
    if (canGoBack.value) {
      systemSounds.back();
      navigationService.back();
    }
  };

  const navigateTo = async (path) => {
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

    const agent = await agentfs.getAgent();
    await agent.fs.rmdir(path);
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
            disabled=${!canGoBack.value}
            style=${{ display: canGoBack.value ? '' : 'none' }}
            aria-label="Go back"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" />
            </svg>
          </button>
          <button
            class="forward-btn"
            type="button"
            onClick=${() => navigate.forward()}
            disabled=${!canGoForward.value}
            style=${{ display: canGoForward.value ? '' : 'none' }}
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
              <svg viewBox="0 0 24 24">
                <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="empty-state-text">this space is empty</span>
            </div>
          ` : files.value.map((file, index) => html`
            <div
              class="node"
              data-path=${file.path}
              data-type=${file.type}
              data-name=${file.name}
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
          <button class="context-menu-item" onClick=${() => handleContextAction('download')}>
            <svg viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            download
          </button>
          <div class="context-menu-separator"></div>
          <button class="context-menu-item context-menu-item--danger" onClick=${() => handleContextAction('delete')}>
            <svg viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            delete
          </button>
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
  styles,
});
