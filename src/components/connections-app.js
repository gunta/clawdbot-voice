/**
 * Connections App Component
 * Data sync and backup management for CLAWD OS1
 * - Download/Upload OPFS (entire filesystem)
 * - Download/Upload AgentFS SQLite database
 */
import { html } from 'htm/preact';
import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { createShadowComponent } from '../lib/shadow-component.js';
import { ErrorBoundary } from '../lib/error-boundary.js';
import { navigate, canGoBack } from '../services/navigation-signals.js';
import { systemSounds, navigationService, agentfs } from '../services/index.js';

const styles = `
/**
 * Connections App - Data Sync & Backup Interface
 * Clean, minimal interface for data management
 */

:host {
  position: fixed;
  inset: 0;
  z-index: 900;
  display: flex;
  flex-direction: column;
  background: var(--color-bg, oklch(0.12 0.01 250));
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
  border-bottom: 1px solid oklch(1 0 0 / 0.08);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.back-btn,
.close-btn {
  background: transparent;
  border: 1px solid oklch(1 0 0 / 0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.15s ease;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
}

.back-btn:hover,
.close-btn:hover {
  border-color: oklch(1 0 0 / 0.5);
  background: oklch(1 0 0 / 0.08);
}

.back-btn:active,
.close-btn:active {
  transform: scale(0.96);
}

.back-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
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
}

.title {
  font-family: var(--font-body, 'Cormorant Garamond', serif);
  font-style: italic;
  font-size: 1.15rem;
  font-weight: 400;
  color: oklch(1 0 0 / 0.85);
  letter-spacing: 0.08em;
}

/* Content */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Section */
.section {
  background: oklch(1 0 0 / 0.03);
  border: 1px solid oklch(1 0 0 / 0.08);
  border-radius: 1.25rem;
  padding: 1.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.section-icon {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: oklch(1 0 0 / 0.06);
  border-radius: 0.75rem;
}

.section-icon svg {
  width: 1.25rem;
  height: 1.25rem;
  stroke: oklch(1 0 0 / 0.7);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
}

.section-title {
  font-family: var(--font-body, 'Cormorant Garamond', serif);
  font-size: 1.1rem;
  font-weight: 500;
  color: oklch(1 0 0 / 0.9);
  letter-spacing: 0.04em;
}

.section-description {
  font-family: var(--font-body, 'Cormorant Garamond', serif);
  font-size: 0.9rem;
  color: oklch(1 0 0 / 0.5);
  margin-bottom: 1.25rem;
  line-height: 1.6;
}

/* Action Buttons */
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1.25rem;
  background: oklch(1 0 0 / 0.06);
  border: 1px solid oklch(1 0 0 / 0.12);
  border-radius: 0.75rem;
  font-family: var(--font-body, 'Cormorant Garamond', serif);
  font-size: 0.9rem;
  color: oklch(1 0 0 / 0.8);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: oklch(1 0 0 / 0.1);
  border-color: oklch(1 0 0 / 0.2);
  color: oklch(1 0 0 / 0.95);
}

.action-btn:active {
  transform: scale(0.98);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn svg {
  width: 1.1rem;
  height: 1.1rem;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
}

.action-btn--primary {
  background: var(--color-red, oklch(0.55 0.155 25));
  border-color: transparent;
  color: oklch(1 0 0 / 0.95);
}

.action-btn--primary:hover {
  background: oklch(0.6 0.17 25);
}

/* File Input Hidden */
.file-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

/* Status Messages */
.status {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-family: var(--font-body, 'Cormorant Garamond', serif);
  font-size: 0.85rem;
  margin-top: 1rem;
}

.status--info {
  background: oklch(0.5 0.1 240 / 0.15);
  color: oklch(0.7 0.1 240);
  border: 1px solid oklch(0.5 0.1 240 / 0.3);
}

.status--success {
  background: oklch(0.5 0.15 145 / 0.15);
  color: oklch(0.7 0.15 145);
  border: 1px solid oklch(0.5 0.15 145 / 0.3);
}

.status--error {
  background: oklch(0.5 0.15 25 / 0.15);
  color: oklch(0.7 0.15 25);
  border: 1px solid oklch(0.5 0.15 25 / 0.3);
}

.status--loading {
  background: oklch(0.5 0.1 60 / 0.15);
  color: oklch(0.7 0.1 60);
  border: 1px solid oklch(0.5 0.1 60 / 0.3);
}

.status svg {
  width: 1rem;
  height: 1rem;
  stroke: currentColor;
  stroke-width: 2;
  fill: none;
  flex-shrink: 0;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Info Box */
.info-box {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: oklch(0.5 0.1 240 / 0.08);
  border: 1px solid oklch(0.5 0.1 240 / 0.15);
  border-radius: 0.75rem;
  margin-top: 1rem;
}

.info-box svg {
  width: 1.1rem;
  height: 1.1rem;
  stroke: oklch(0.7 0.1 240);
  stroke-width: 1.5;
  fill: none;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.info-box-text {
  font-family: var(--font-body, 'Cormorant Garamond', serif);
  font-size: 0.85rem;
  color: oklch(1 0 0 / 0.6);
  line-height: 1.5;
}

/* Footer */
.footer {
  padding: 1rem 2rem;
  border-top: 1px solid oklch(1 0 0 / 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
}

.footer-text {
  font-family: var(--font-body, 'Cormorant Garamond', serif);
  font-size: 0.75rem;
  font-style: italic;
  color: oklch(1 0 0 / 0.35);
  letter-spacing: 0.06em;
}

/* HDR Enhancement */
@media (dynamic-range: high) {
  .action-btn--primary {
    background: var(--hdr-red, oklch(0.65 0.2 25));
  }

  .title {
    color: var(--hdr-white-bright, oklch(1.15 0 0));
  }
}

/* Responsive */
@media (max-width: 600px) {
  .header {
    padding: 1.25rem 1.5rem;
  }

  .content {
    padding: 1.5rem;
  }

  .section {
    padding: 1.25rem;
  }

  .actions {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
    justify-content: center;
  }
}
`;

/**
 * Sanitize filename for cross-platform compatibility
 * Replaces characters that are problematic on macOS/Windows
 */
function sanitizeFilename(name) {
  return name
    .replace(/:/g, '_')      // Colon (macOS path separator)
    .replace(/\?/g, '_')     // Question mark
    .replace(/&/g, '_')      // Ampersand
    .replace(/\*/g, '_')     // Asterisk
    .replace(/"/g, '_')      // Double quote
    .replace(/</g, '_')      // Less than
    .replace(/>/g, '_')      // Greater than
    .replace(/\|/g, '_')     // Pipe
    .replace(/\\/g, '_')     // Backslash
    .replace(/\s+/g, '_')    // Multiple spaces
    .replace(/_+/g, '_')     // Collapse multiple underscores
    .replace(/^_|_$/g, '');  // Trim leading/trailing underscores
}

/**
 * Recursively collect all files from OPFS directory
 */
async function collectOPFSFiles(dirHandle, basePath = '') {
  const files = [];
  
  for await (const [name, handle] of dirHandle) {
    // Sanitize the filename for cross-platform compatibility
    const safeName = sanitizeFilename(name);
    const path = basePath ? `${basePath}/${safeName}` : safeName;
    
    if (handle.kind === 'file') {
      try {
        const file = await handle.getFile();
        const content = await file.arrayBuffer();
        files.push({ 
          path, 
          originalName: name,  // Keep original for reference
          content: new Uint8Array(content), 
          type: file.type 
        });
      } catch (err) {
        console.warn(`[Connections] Failed to read file: ${path}`, err);
      }
    } else if (handle.kind === 'directory') {
      const subFiles = await collectOPFSFiles(handle, path);
      files.push(...subFiles);
    }
  }
  
  return files;
}

/**
 * CRC-32 lookup table (pre-computed for performance)
 */
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
    table[i] = crc >>> 0;
  }
  return table;
})();

/**
 * Calculate CRC-32 checksum for a Uint8Array
 */
function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Convert Date to DOS date/time format for ZIP
 */
function dateToDos(date) {
  const time = ((date.getHours() & 0x1F) << 11) |
               ((date.getMinutes() & 0x3F) << 5) |
               ((date.getSeconds() >> 1) & 0x1F);
  const dosDate = (((date.getFullYear() - 1980) & 0x7F) << 9) |
                  ((date.getMonth() + 1) & 0x0F) << 5 |
                  (date.getDate() & 0x1F);
  return { time, date: dosDate };
}

/**
 * Create a ZIP file from collected files
 * Compatible with macOS Archive Utility
 */
function createZip(files) {
  const textEncoder = new TextEncoder();
  const chunks = [];
  const centralDirectory = [];
  let offset = 0;
  const now = dateToDos(new Date());

  for (const file of files) {
    // Ensure path uses forward slashes and has no leading slash
    const cleanPath = file.path.replace(/\\/g, '/').replace(/^\/+/, '');
    const pathBytes = textEncoder.encode(cleanPath);
    const content = file.content;
    const fileCrc = crc32(content);
    
    // Local file header (30 bytes + filename)
    const localHeader = new Uint8Array(30 + pathBytes.length);
    const view = new DataView(localHeader.buffer);
    
    view.setUint32(0, 0x04034b50, true);  // Local file header signature
    view.setUint16(4, 10, true);           // Version needed (1.0 for STORE)
    view.setUint16(6, 0, true);            // General purpose bit flag
    view.setUint16(8, 0, true);            // Compression method (0 = STORE)
    view.setUint16(10, now.time, true);    // Last mod time
    view.setUint16(12, now.date, true);    // Last mod date
    view.setUint32(14, fileCrc, true);     // CRC-32
    view.setUint32(18, content.length, true); // Compressed size
    view.setUint32(22, content.length, true); // Uncompressed size
    view.setUint16(26, pathBytes.length, true); // File name length
    view.setUint16(28, 0, true);           // Extra field length
    localHeader.set(pathBytes, 30);

    chunks.push(localHeader);
    chunks.push(content);

    // Central directory entry (46 bytes + filename)
    const centralEntry = new Uint8Array(46 + pathBytes.length);
    const centralView = new DataView(centralEntry.buffer);
    
    centralView.setUint32(0, 0x02014b50, true);  // Central dir signature
    centralView.setUint16(4, 0x031E, true);      // Version made by (Unix, v3.0)
    centralView.setUint16(6, 10, true);          // Version needed (1.0)
    centralView.setUint16(8, 0, true);           // General purpose bit flag
    centralView.setUint16(10, 0, true);          // Compression method (STORE)
    centralView.setUint16(12, now.time, true);   // Last mod time
    centralView.setUint16(14, now.date, true);   // Last mod date
    centralView.setUint32(16, fileCrc, true);    // CRC-32
    centralView.setUint32(20, content.length, true); // Compressed size
    centralView.setUint32(24, content.length, true); // Uncompressed size
    centralView.setUint16(28, pathBytes.length, true); // File name length
    centralView.setUint16(30, 0, true);          // Extra field length
    centralView.setUint16(32, 0, true);          // File comment length
    centralView.setUint16(34, 0, true);          // Disk number start
    centralView.setUint16(36, 0, true);          // Internal file attributes (binary)
    // External attributes: Unix regular file with 0644 permissions
    // Format: (mode << 16) | DOS attributes
    // 0100644 octal = 0x81A4, shifted left 16 bits = 0x81A40000
    centralView.setUint32(38, 0, true);          // Simplified: no external attributes
    centralView.setUint32(42, offset, true);     // Offset of local header
    centralEntry.set(pathBytes, 46);

    centralDirectory.push(centralEntry);
    offset += localHeader.length + content.length;
  }

  // Write central directory
  const centralDirOffset = offset;
  let centralDirSize = 0;
  
  for (const entry of centralDirectory) {
    chunks.push(entry);
    centralDirSize += entry.length;
  }

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  
  eocdView.setUint32(0, 0x06054b50, true);  // EOCD signature
  eocdView.setUint16(4, 0, true);            // Disk number
  eocdView.setUint16(6, 0, true);            // Disk with central dir
  eocdView.setUint16(8, files.length, true); // Entries on this disk
  eocdView.setUint16(10, files.length, true);// Total entries
  eocdView.setUint32(12, centralDirSize, true);   // Central dir size
  eocdView.setUint32(16, centralDirOffset, true); // Central dir offset
  eocdView.setUint16(20, 0, true);           // Comment length

  chunks.push(eocd);

  // Combine all chunks into final ZIP
  const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalSize);
  let pos = 0;
  
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }

  return result;
}

/**
 * Download a Blob as a file
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ConnectionsApp({ host }) {
  const isVisible = useSignal(false);
  const opfsStatus = useSignal(null); // { type: 'info'|'success'|'error'|'loading', message: string }
  const dbStatus = useSignal(null);
  const isDownloadingOPFS = useSignal(false);
  const isDownloadingDB = useSignal(false);
  const isUploadingDB = useSignal(false);

  // Navigation handlers
  const handleClose = () => {
    systemSounds.close();
    navigationService.close();
  };

  const handleBack = () => {
    if (canGoBack.value) {
      systemSounds.back();
      navigationService.back();
    }
  };

  // OPFS Download
  const downloadOPFS = async () => {
    if (isDownloadingOPFS.value) return;
    
    isDownloadingOPFS.value = true;
    opfsStatus.value = { type: 'loading', message: 'Collecting OPFS files...' };

    try {
      const root = await navigator.storage.getDirectory();
      const files = await collectOPFSFiles(root);

      if (files.length === 0) {
        opfsStatus.value = { type: 'info', message: 'OPFS is empty. Nothing to download.' };
        return;
      }

      opfsStatus.value = { type: 'loading', message: `Creating ZIP with ${files.length} files...` };
      
      const zipData = createZip(files);
      const blob = new Blob([zipData], { type: 'application/zip' });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadBlob(blob, `clawd-os1-opfs-${timestamp}.zip`);

      opfsStatus.value = { type: 'success', message: `Downloaded ${files.length} files successfully!` };
      systemSounds.success();
    } catch (err) {
      console.error('[Connections] OPFS download failed:', err);
      opfsStatus.value = { type: 'error', message: `Failed to download: ${err.message}` };
      systemSounds.error();
    } finally {
      isDownloadingOPFS.value = false;
    }
  };

  // AgentFS Database Download - exports all data as JSON
  const downloadAgentFS = async () => {
    if (isDownloadingDB.value) return;
    
    isDownloadingDB.value = true;
    dbStatus.value = { type: 'loading', message: 'Exporting AgentFS data...' };

    try {
      await agentfs.init();
      const agent = await agentfs.getAgent();
      const db = agent.getDatabase();
      
      if (!db) {
        throw new Error('Database not accessible');
      }

      dbStatus.value = { type: 'loading', message: 'Reading filesystem data...' };

      // Export all AgentFS tables as JSON
      const exportData = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        source: 'clawd-os1',
        tables: {}
      };

      // Export KV store
      const kvRows = await db.prepare('SELECT key, value, created_at, updated_at FROM kv_store').all();
      exportData.tables.kv_store = kvRows.map(row => ({
        key: row.key,
        value: JSON.parse(row.value),
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

      // Export filesystem inodes
      const inodes = await db.prepare(`
        SELECT ino, mode, nlink, uid, gid, size, atime, mtime, ctime 
        FROM fs_inode
      `).all();
      exportData.tables.fs_inode = inodes;

      // Export directory entries
      const dentries = await db.prepare(`
        SELECT id, name, parent_ino, ino 
        FROM fs_dentry
      `).all();
      exportData.tables.fs_dentry = dentries;

      // Export file data (as base64)
      dbStatus.value = { type: 'loading', message: 'Reading file contents...' };
      const dataChunks = await db.prepare(`
        SELECT ino, chunk_index, data 
        FROM fs_data 
        ORDER BY ino, chunk_index
      `).all();
      
      exportData.tables.fs_data = dataChunks.map(row => ({
        ino: row.ino,
        chunk_index: row.chunk_index,
        // Convert Uint8Array/Buffer to base64 for JSON serialization
        data: bufferToBase64(row.data)
      }));

      // Export symlinks
      const symlinks = await db.prepare('SELECT ino, target FROM fs_symlink').all();
      exportData.tables.fs_symlink = symlinks;

      // Export tool calls if exists
      try {
        const toolCalls = await db.prepare(`
          SELECT id, name, parameters, result, error, status, started_at, completed_at, duration_ms 
          FROM tool_calls
        `).all();
        exportData.tables.tool_calls = toolCalls;
      } catch {
        // Table might not exist
      }

      // Export fs_config
      try {
        const fsConfig = await db.prepare('SELECT key, value FROM fs_config').all();
        exportData.tables.fs_config = fsConfig;
      } catch {
        // Table might not exist
      }

      dbStatus.value = { type: 'loading', message: 'Creating backup file...' };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadBlob(blob, `clawd-os1-backup-${timestamp}.json`);

      const fileCount = dentries.filter(d => {
        const inode = inodes.find(i => i.ino === d.ino);
        return inode && (inode.mode & 0o170000) === 0o100000; // Regular file
      }).length;

      dbStatus.value = { 
        type: 'success', 
        message: `Exported ${fileCount} files, ${exportData.tables.kv_store.length} KV entries!` 
      };
      systemSounds.success();
    } catch (err) {
      console.error('[Connections] AgentFS download failed:', err);
      dbStatus.value = { type: 'error', message: `Failed to export: ${err.message}` };
      systemSounds.error();
    } finally {
      isDownloadingDB.value = false;
    }
  };

  /**
   * Convert Uint8Array/Buffer to base64 string
   */
  function bufferToBase64(buffer) {
    if (!buffer) return '';
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 string to Uint8Array
   */
  function base64ToBuffer(base64) {
    if (!base64) return new Uint8Array(0);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // AgentFS Database Upload - restores from JSON backup
  const handleDBFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = '';

    if (isUploadingDB.value) return;

    // Validate file type
    if (!file.name.endsWith('.json')) {
      dbStatus.value = { type: 'error', message: 'Please select a .json backup file' };
      return;
    }

    const confirmed = confirm(
      'Are you sure you want to restore this backup?\n\n' +
      'This will REPLACE your current data. Make sure you have a backup of your current data first!'
    );

    if (!confirmed) return;

    isUploadingDB.value = true;
    dbStatus.value = { type: 'loading', message: 'Reading backup file...' };

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      // Validate backup format
      if (!backupData.version || !backupData.tables) {
        throw new Error('Invalid backup file format');
      }

      await agentfs.init();
      const agent = await agentfs.getAgent();
      const db = agent.getDatabase();

      if (!db) {
        throw new Error('Database not accessible');
      }

      dbStatus.value = { type: 'loading', message: 'Clearing existing data...' };

      // Clear existing data (in correct order to avoid FK issues)
      await db.exec('DELETE FROM fs_data');
      await db.exec('DELETE FROM fs_symlink');
      await db.exec('DELETE FROM fs_dentry WHERE ino != 1'); // Keep root
      await db.exec('DELETE FROM fs_inode WHERE ino != 1'); // Keep root
      await db.exec('DELETE FROM kv_store');
      
      try {
        await db.exec('DELETE FROM tool_calls');
      } catch {
        // Table might not exist
      }

      dbStatus.value = { type: 'loading', message: 'Restoring KV store...' };

      // Restore KV store
      if (backupData.tables.kv_store) {
        const kvStmt = await db.prepare(`
          INSERT INTO kv_store (key, value, created_at, updated_at) 
          VALUES (?, ?, ?, ?)
        `);
        for (const row of backupData.tables.kv_store) {
          await kvStmt.run(
            row.key, 
            JSON.stringify(row.value), 
            row.created_at, 
            row.updated_at
          );
        }
      }

      dbStatus.value = { type: 'loading', message: 'Restoring filesystem...' };

      // Restore inodes (skip root inode = 1)
      if (backupData.tables.fs_inode) {
        const inodeStmt = await db.prepare(`
          INSERT OR REPLACE INTO fs_inode (ino, mode, nlink, uid, gid, size, atime, mtime, ctime) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const row of backupData.tables.fs_inode) {
          if (row.ino === 1) continue; // Skip root, it already exists
          await inodeStmt.run(
            row.ino, row.mode, row.nlink, row.uid, row.gid, 
            row.size, row.atime, row.mtime, row.ctime
          );
        }
      }

      // Restore directory entries
      if (backupData.tables.fs_dentry) {
        const dentryStmt = await db.prepare(`
          INSERT INTO fs_dentry (id, name, parent_ino, ino) 
          VALUES (?, ?, ?, ?)
        `);
        for (const row of backupData.tables.fs_dentry) {
          await dentryStmt.run(row.id, row.name, row.parent_ino, row.ino);
        }
      }

      dbStatus.value = { type: 'loading', message: 'Restoring file contents...' };

      // Restore file data
      if (backupData.tables.fs_data) {
        const dataStmt = await db.prepare(`
          INSERT INTO fs_data (ino, chunk_index, data) 
          VALUES (?, ?, ?)
        `);
        for (const row of backupData.tables.fs_data) {
          const buffer = base64ToBuffer(row.data);
          await dataStmt.run(row.ino, row.chunk_index, buffer);
        }
      }

      // Restore symlinks
      if (backupData.tables.fs_symlink) {
        const symlinkStmt = await db.prepare(`
          INSERT INTO fs_symlink (ino, target) 
          VALUES (?, ?)
        `);
        for (const row of backupData.tables.fs_symlink) {
          await symlinkStmt.run(row.ino, row.target);
        }
      }

      // Restore fs_config
      if (backupData.tables.fs_config) {
        const configStmt = await db.prepare(`
          INSERT OR REPLACE INTO fs_config (key, value) 
          VALUES (?, ?)
        `);
        for (const row of backupData.tables.fs_config) {
          await configStmt.run(row.key, row.value);
        }
      }

      const fileCount = backupData.tables.fs_dentry?.length || 0;
      const kvCount = backupData.tables.kv_store?.length || 0;

      dbStatus.value = { 
        type: 'success', 
        message: `Restored ${fileCount} entries, ${kvCount} KV items! Reload recommended.` 
      };
      systemSounds.success();
    } catch (err) {
      console.error('[Connections] AgentFS restore failed:', err);
      dbStatus.value = { type: 'error', message: `Failed to restore: ${err.message}` };
      systemSounds.error();
    } finally {
      isUploadingDB.value = false;
    }
  };

  // Handle keyboard
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  // Subscribe to navigation service
  useEffect(() => {
    const unsubscribe = navigationService.subscribe((snapshot) => {
      const { current } = snapshot.context;
      const isActive = current?.id === 'connections';

      if (isActive && !isVisible.value) {
        isVisible.value = true;
        host.setAttribute('open', '');
        document.addEventListener('keydown', handleKeyDown);
        // Reset statuses
        opfsStatus.value = null;
        dbStatus.value = null;
      } else if (!isActive && isVisible.value) {
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

  // Expose public API
  useEffect(() => {
    host.open = () => {
      systemSounds.open();
      navigationService.push('connections', 'Connections', {});
    };
    host.close = handleClose;

    if (!Object.getOwnPropertyDescriptor(host, 'isOpen')) {
      Object.defineProperty(host, 'isOpen', {
        configurable: true,
        get: () => isVisible.value
      });
    }
  }, []);

  const renderStatus = (status) => {
    if (!status) return null;

    const icons = {
      info: html`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
      success: html`<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
      error: html`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      loading: html`<svg viewBox="0 0 24 24" class="spinner"><circle cx="12" cy="12" r="10" stroke-dasharray="50" stroke-dashoffset="20"/></svg>`,
    };

    return html`
      <div class="status status--${status.type}">
        ${icons[status.type]}
        <span>${status.message}</span>
      </div>
    `;
  };

  return html`
    <${ErrorBoundary} name="ConnectionsApp">
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
          <span class="title">connections</span>
        </div>
        <button class="close-btn" type="button" onClick=${handleClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </div>

      <div class="content">
        <!-- OPFS Section -->
        <div class="section">
          <div class="section-header">
            <div class="section-icon">
              <svg viewBox="0 0 24 24">
                <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z"/>
              </svg>
            </div>
            <span class="section-title">Origin Private File System</span>
          </div>
          <p class="section-description">
            Download the entire OPFS filesystem as a ZIP archive. This includes all files stored by the browser for CLAWD OS1.
          </p>
          <div class="actions">
            <button
              class="action-btn action-btn--primary"
              onClick=${downloadOPFS}
              disabled=${isDownloadingOPFS.value}
            >
              <svg viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              ${isDownloadingOPFS.value ? 'Downloading...' : 'Download OPFS'}
            </button>
          </div>
          ${renderStatus(opfsStatus.value)}
        </div>

        <!-- AgentFS Section -->
        <div class="section">
          <div class="section-header">
            <div class="section-icon">
              <svg viewBox="0 0 24 24">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              </svg>
            </div>
            <span class="section-title">AgentFS Data Backup</span>
          </div>
          <p class="section-description">
            Export or restore all your data as a portable JSON backup. This includes all files, settings, and app data stored in AgentFS.
          </p>
          <div class="actions">
            <button
              class="action-btn action-btn--primary"
              onClick=${downloadAgentFS}
              disabled=${isDownloadingDB.value || isUploadingDB.value}
            >
              <svg viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              ${isDownloadingDB.value ? 'Exporting...' : 'Export Backup'}
            </button>
            <label class="action-btn" style="cursor: pointer;">
              <svg viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              ${isUploadingDB.value ? 'Restoring...' : 'Restore Backup'}
              <input
                type="file"
                class="file-input"
                accept=".json"
                onChange=${handleDBFileSelect}
                disabled=${isDownloadingDB.value || isUploadingDB.value}
              />
            </label>
          </div>
          ${renderStatus(dbStatus.value)}

          <div class="info-box">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span class="info-box-text">
              The backup is a portable JSON file that can be restored on any device. Restoring will replace all current data.
            </span>
          </div>
        </div>
      </div>

      <div class="footer">
        <span class="footer-text">data sync & backup</span>
      </div>
    <//>
  `;
}

export default createShadowComponent(ConnectionsApp, {
  tag: 'connections-app',
  styles,
});
