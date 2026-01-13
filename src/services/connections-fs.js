/**
 * Connections Filesystem Service
 * Manages connected local folders/files via File System Access API
 * 
 * - Mount table stored in /settings/mounts.json (AgentFS)
 * - FileSystemHandle objects stored in IndexedDB (browser requirement)
 * - Provides filesystem operations for /connections/... paths
 */

import * as agentfsCore from './agentfs.js';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CONNECTIONS_PREFIX = '/connections';
const MOUNTS_PATH = '/settings/mounts.json';
const IDB_NAME = 'clawd-connections';
const IDB_STORE = 'handles';
const IDB_VERSION = 1;

// ─────────────────────────────────────────────────────────────────────────────
// IndexedDB for Handle Storage
// ─────────────────────────────────────────────────────────────────────────────

let dbPromise = null;

/**
 * Open IndexedDB database for handle storage
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
  });
  
  return dbPromise;
}

/**
 * Store a handle in IndexedDB
 * @param {string} id - Mount ID
 * @param {FileSystemHandle} handle - Directory or file handle
 */
async function storeHandle(id, handle) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const request = store.put({ id, handle });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve a handle from IndexedDB
 * @param {string} id - Mount ID
 * @returns {Promise<FileSystemHandle|null>}
 */
async function retrieveHandle(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result?.handle || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a handle from IndexedDB
 * @param {string} id - Mount ID
 */
async function deleteHandle(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mount Table (in AgentFS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the mounts configuration
 * @returns {Promise<{mounts: Array}>}
 */
async function getMountsConfig() {
  try {
    const config = await agentfsCore.readJSON(MOUNTS_PATH);
    return config || { mounts: [] };
  } catch {
    return { mounts: [] };
  }
}

/**
 * Save the mounts configuration
 * @param {Object} config
 */
async function saveMountsConfig(config) {
  await agentfsCore.writeJSON(MOUNTS_PATH, config);
}

/**
 * Generate a unique mount ID
 * @returns {string}
 */
function generateMountId() {
  return crypto.randomUUID().slice(0, 8);
}

/**
 * Sanitize a name for use as a mount point
 * Handles duplicates by appending -2, -3, etc.
 * @param {string} name - Original name
 * @param {Array} existingMounts - Current mounts
 * @returns {string}
 */
function sanitizeMountName(name, existingMounts) {
  // Basic sanitization: replace problematic characters
  let safeName = name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim() || 'folder';
  
  // Check for duplicates
  const existingNames = new Set(existingMounts.map(m => m.name.toLowerCase()));
  if (!existingNames.has(safeName.toLowerCase())) {
    return safeName;
  }
  
  // Append suffix for duplicates
  let counter = 2;
  while (existingNames.has(`${safeName}-${counter}`.toLowerCase())) {
    counter++;
  }
  return `${safeName}-${counter}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Path Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if path is under /connections
 * @param {string} path
 * @returns {boolean}
 */
export function isConnectionPath(path) {
  return path === CONNECTIONS_PREFIX || path.startsWith(CONNECTIONS_PREFIX + '/');
}

/**
 * Parse a /connections path into mount name and relative path
 * @param {string} path - e.g. "/connections/Projects/src/file.js"
 * @returns {{ mountName: string, relativePath: string } | null}
 */
export function parseMountPath(path) {
  if (!isConnectionPath(path)) return null;
  
  // Remove prefix
  const withoutPrefix = path.slice(CONNECTIONS_PREFIX.length);
  if (!withoutPrefix || withoutPrefix === '/') {
    return null; // This is /connections itself, not a mount
  }
  
  // Remove leading slash
  const clean = withoutPrefix.startsWith('/') ? withoutPrefix.slice(1) : withoutPrefix;
  
  const slashIndex = clean.indexOf('/');
  if (slashIndex === -1) {
    return { mountName: clean, relativePath: '' };
  }
  
  return {
    mountName: clean.slice(0, slashIndex),
    relativePath: clean.slice(slashIndex + 1)
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if File System Access API is supported
 * @returns {boolean}
 */
export function isSupported() {
  return 'showDirectoryPicker' in window;
}

/**
 * Check if we can get handles from drag/drop
 * @returns {boolean}
 */
export function supportsHandleFromDrop() {
  return 'getAsFileSystemHandle' in DataTransferItem.prototype;
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check permission status for a handle
 * @param {FileSystemHandle} handle
 * @param {string} [mode='readwrite']
 * @returns {Promise<'granted'|'denied'|'prompt'>}
 */
export async function checkPermission(handle, mode = 'readwrite') {
  try {
    return await handle.queryPermission({ mode });
  } catch {
    return 'denied';
  }
}

/**
 * Request permission for a handle
 * @param {FileSystemHandle} handle
 * @param {string} [mode='readwrite']
 * @returns {Promise<boolean>}
 */
export async function requestPermission(handle, mode = 'readwrite') {
  try {
    const result = await handle.requestPermission({ mode });
    return result === 'granted';
  } catch {
    return false;
  }
}

/**
 * Ensure we have permission, requesting if needed
 * @param {FileSystemHandle} handle
 * @returns {Promise<boolean>}
 */
async function ensurePermission(handle) {
  const status = await checkPermission(handle);
  if (status === 'granted') return true;
  return requestPermission(handle);
}

// ─────────────────────────────────────────────────────────────────────────────
// Handle Navigation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Navigate to a subdirectory via handle
 * @param {FileSystemDirectoryHandle} rootHandle
 * @param {string} relativePath
 * @returns {Promise<FileSystemDirectoryHandle>}
 */
async function getDirectoryHandle(rootHandle, relativePath) {
  if (!relativePath) return rootHandle;
  
  const parts = relativePath.split('/').filter(Boolean);
  let current = rootHandle;
  
  for (const part of parts) {
    current = await current.getDirectoryHandle(part);
  }
  
  return current;
}

/**
 * Get a file handle at a relative path
 * @param {FileSystemDirectoryHandle} rootHandle
 * @param {string} relativePath
 * @returns {Promise<FileSystemFileHandle>}
 */
async function getFileHandleAtPath(rootHandle, relativePath) {
  const parts = relativePath.split('/').filter(Boolean);
  const fileName = parts.pop();
  
  if (!fileName) {
    throw new Error('Invalid file path');
  }
  
  let dirHandle = rootHandle;
  for (const part of parts) {
    dirHandle = await dirHandle.getDirectoryHandle(part);
  }
  
  return dirHandle.getFileHandle(fileName);
}

/**
 * Get a file or directory handle at a relative path
 * @param {FileSystemDirectoryHandle} rootHandle
 * @param {string} relativePath
 * @returns {Promise<{handle: FileSystemHandle, kind: 'file'|'directory'}>}
 */
async function getHandleAtPath(rootHandle, relativePath) {
  if (!relativePath) {
    return { handle: rootHandle, kind: 'directory' };
  }
  
  const parts = relativePath.split('/').filter(Boolean);
  const targetName = parts.pop();
  
  if (!targetName) {
    return { handle: rootHandle, kind: 'directory' };
  }
  
  // Navigate to parent directory
  let dirHandle = rootHandle;
  for (const part of parts) {
    dirHandle = await dirHandle.getDirectoryHandle(part);
  }
  
  // Try as directory first, then file
  try {
    const handle = await dirHandle.getDirectoryHandle(targetName);
    return { handle, kind: 'directory' };
  } catch {
    const handle = await dirHandle.getFileHandle(targetName);
    return { handle, kind: 'file' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mount Management (Public API)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Connect a folder via the directory picker
 * @param {string} [suggestedName] - Optional name for the mount
 * @returns {Promise<{id: string, name: string, mountPoint: string}|null>}
 */
export async function connectFolder(suggestedName) {
  if (!isSupported()) {
    console.warn('[ConnectionsFS] File System Access API not supported');
    return null;
  }
  
  try {
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite'
    });
    
    return connectDirectoryHandle(handle, suggestedName);
  } catch (err) {
    if (err.name === 'AbortError') {
      return null; // User cancelled
    }
    console.error('[ConnectionsFS] Failed to connect folder:', err);
    throw err;
  }
}

/**
 * Connect a directory handle (e.g., from drag/drop)
 * @param {FileSystemDirectoryHandle} handle
 * @param {string} [suggestedName]
 * @returns {Promise<{id: string, name: string, mountPoint: string}>}
 */
export async function connectDirectoryHandle(handle, suggestedName) {
  await agentfsCore.init();
  
  const config = await getMountsConfig();
  const name = sanitizeMountName(suggestedName || handle.name, config.mounts);
  const id = generateMountId();
  const now = Date.now();
  
  const mount = {
    id,
    name,
    kind: 'directory',
    mountPoint: `${CONNECTIONS_PREFIX}/${name}`,
    connectedAt: now,
    lastAccessed: now
  };
  
  // Store handle in IndexedDB
  await storeHandle(id, handle);
  
  // Update mount table
  config.mounts.push(mount);
  await saveMountsConfig(config);
  
  console.log('[ConnectionsFS] Connected folder:', mount.mountPoint);
  return mount;
}

/**
 * Connect a file handle (e.g., from drag/drop for direct editing)
 * @param {FileSystemFileHandle} handle
 * @param {string} [suggestedName]
 * @returns {Promise<{id: string, name: string, mountPoint: string}>}
 */
export async function connectFileHandle(handle, suggestedName) {
  await agentfsCore.init();
  
  const config = await getMountsConfig();
  const name = sanitizeMountName(suggestedName || handle.name, config.mounts);
  const id = generateMountId();
  const now = Date.now();
  
  const mount = {
    id,
    name,
    kind: 'file',
    mountPoint: `${CONNECTIONS_PREFIX}/${name}`,
    connectedAt: now,
    lastAccessed: now
  };
  
  // Store handle in IndexedDB
  await storeHandle(id, handle);
  
  // Update mount table
  config.mounts.push(mount);
  await saveMountsConfig(config);
  
  console.log('[ConnectionsFS] Connected file:', mount.mountPoint);
  return mount;
}

/**
 * Disconnect a mount
 * @param {string} id - Mount ID
 */
export async function disconnect(id) {
  const config = await getMountsConfig();
  const index = config.mounts.findIndex(m => m.id === id);
  
  if (index === -1) {
    console.warn('[ConnectionsFS] Mount not found:', id);
    return;
  }
  
  const mount = config.mounts[index];
  
  // Remove from IndexedDB
  await deleteHandle(id);
  
  // Remove from mount table
  config.mounts.splice(index, 1);
  await saveMountsConfig(config);
  
  console.log('[ConnectionsFS] Disconnected:', mount.mountPoint);
}

/**
 * Rename a mount
 * @param {string} id - Mount ID
 * @param {string} newName - New name
 * @returns {Promise<{mountPoint: string}|null>}
 */
export async function renameMount(id, newName) {
  const config = await getMountsConfig();
  const mount = config.mounts.find(m => m.id === id);
  
  if (!mount) {
    console.warn('[ConnectionsFS] Mount not found:', id);
    return null;
  }
  
  // Sanitize new name (avoiding duplicates with other mounts)
  const otherMounts = config.mounts.filter(m => m.id !== id);
  const safeName = sanitizeMountName(newName, otherMounts);
  
  mount.name = safeName;
  mount.mountPoint = `${CONNECTIONS_PREFIX}/${safeName}`;
  
  await saveMountsConfig(config);
  
  console.log('[ConnectionsFS] Renamed mount to:', mount.mountPoint);
  return { mountPoint: mount.mountPoint };
}

/**
 * List all mounts with permission status
 * @returns {Promise<Array<{id, name, kind, mountPoint, permissionState}>>}
 */
export async function listMounts() {
  await agentfsCore.init();
  const config = await getMountsConfig();
  
  const mounts = await Promise.all(
    config.mounts.map(async (mount) => {
      const handle = await retrieveHandle(mount.id);
      let permissionState = 'denied';
      
      if (handle) {
        permissionState = await checkPermission(handle);
      }
      
      return {
        ...mount,
        permissionState
      };
    })
  );
  
  return mounts;
}

/**
 * Get a mount by name
 * @param {string} name
 * @returns {Promise<Object|null>}
 */
async function getMountByName(name) {
  const config = await getMountsConfig();
  return config.mounts.find(m => m.name === name) || null;
}

/**
 * Request permission for a mount
 * @param {string} id - Mount ID
 * @returns {Promise<boolean>}
 */
export async function requestMountPermission(id) {
  const handle = await retrieveHandle(id);
  if (!handle) {
    console.warn('[ConnectionsFS] Handle not found for mount:', id);
    return false;
  }
  
  return requestPermission(handle);
}

// ─────────────────────────────────────────────────────────────────────────────
// Filesystem Operations for /connections paths
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read a file from /connections
 * @param {string} path - e.g., "/connections/Projects/src/file.js"
 * @param {string} [encoding] - e.g., "utf-8"
 * @returns {Promise<string|ArrayBuffer|null>}
 */
export async function readFile(path, encoding) {
  const parsed = parseMountPath(path);
  if (!parsed) {
    throw new Error(`Invalid connections path: ${path}`);
  }
  
  const mount = await getMountByName(parsed.mountName);
  if (!mount) {
    throw new Error(`Mount not found: ${parsed.mountName}`);
  }
  
  const rootHandle = await retrieveHandle(mount.id);
  if (!rootHandle) {
    throw new Error(`Handle not found for mount: ${parsed.mountName}`);
  }
  
  if (!await ensurePermission(rootHandle)) {
    throw new Error(`Permission denied for: ${parsed.mountName}`);
  }
  
  let fileHandle;
  
  if (mount.kind === 'file') {
    // Direct file mount
    if (parsed.relativePath) {
      throw new Error(`Cannot access subpath of file mount: ${path}`);
    }
    fileHandle = rootHandle;
  } else {
    // Directory mount
    fileHandle = await getFileHandleAtPath(rootHandle, parsed.relativePath);
  }
  
  const file = await fileHandle.getFile();
  
  if (encoding) {
    return file.text();
  }
  return file.arrayBuffer();
}

/**
 * Write a file to /connections
 * @param {string} path
 * @param {string|ArrayBuffer|Uint8Array} data
 */
export async function writeFile(path, data) {
  const parsed = parseMountPath(path);
  if (!parsed) {
    throw new Error(`Invalid connections path: ${path}`);
  }
  
  const mount = await getMountByName(parsed.mountName);
  if (!mount) {
    throw new Error(`Mount not found: ${parsed.mountName}`);
  }
  
  const rootHandle = await retrieveHandle(mount.id);
  if (!rootHandle) {
    throw new Error(`Handle not found for mount: ${parsed.mountName}`);
  }
  
  if (!await ensurePermission(rootHandle)) {
    throw new Error(`Permission denied for: ${parsed.mountName}`);
  }
  
  let fileHandle;
  
  if (mount.kind === 'file') {
    if (parsed.relativePath) {
      throw new Error(`Cannot access subpath of file mount: ${path}`);
    }
    fileHandle = rootHandle;
  } else {
    // For directories, create file if it doesn't exist
    const parts = parsed.relativePath.split('/').filter(Boolean);
    const fileName = parts.pop();
    
    if (!fileName) {
      throw new Error(`Invalid file path: ${path}`);
    }
    
    // Navigate/create parent directories
    let dirHandle = rootHandle;
    for (const part of parts) {
      dirHandle = await dirHandle.getDirectoryHandle(part, { create: true });
    }
    
    fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  }
  
  const writable = await fileHandle.createWritable();
  await writable.write(data);
  await writable.close();
}

/**
 * Read directory contents from /connections
 * @param {string} path
 * @returns {Promise<string[]>}
 */
export async function readdir(path) {
  // Special case: /connections itself
  if (path === CONNECTIONS_PREFIX || path === CONNECTIONS_PREFIX + '/') {
    const mounts = await listMounts();
    return mounts.map(m => m.name);
  }
  
  const parsed = parseMountPath(path);
  if (!parsed) {
    throw new Error(`Invalid connections path: ${path}`);
  }
  
  const mount = await getMountByName(parsed.mountName);
  if (!mount) {
    throw new Error(`Mount not found: ${parsed.mountName}`);
  }
  
  if (mount.kind === 'file') {
    throw new Error(`Cannot readdir on file mount: ${path}`);
  }
  
  const rootHandle = await retrieveHandle(mount.id);
  if (!rootHandle) {
    throw new Error(`Handle not found for mount: ${parsed.mountName}`);
  }
  
  if (!await ensurePermission(rootHandle)) {
    throw new Error(`Permission denied for: ${parsed.mountName}`);
  }
  
  const dirHandle = await getDirectoryHandle(rootHandle, parsed.relativePath);
  
  const entries = [];
  for await (const [name] of dirHandle.entries()) {
    entries.push(name);
  }
  
  return entries.sort();
}

/**
 * Check if a path exists under /connections
 * @param {string} path
 * @returns {Promise<boolean>}
 */
export async function exists(path) {
  // /connections always exists
  if (path === CONNECTIONS_PREFIX || path === CONNECTIONS_PREFIX + '/') {
    return true;
  }
  
  const parsed = parseMountPath(path);
  if (!parsed) {
    return false;
  }
  
  const mount = await getMountByName(parsed.mountName);
  if (!mount) {
    return false;
  }
  
  // If no relative path, mount exists
  if (!parsed.relativePath) {
    return true;
  }
  
  if (mount.kind === 'file') {
    // File mount doesn't have subpaths
    return false;
  }
  
  const rootHandle = await retrieveHandle(mount.id);
  if (!rootHandle) {
    return false;
  }
  
  try {
    if (!await ensurePermission(rootHandle)) {
      return false;
    }
    await getHandleAtPath(rootHandle, parsed.relativePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file/directory stats for a /connections path
 * @param {string} path
 * @returns {Promise<{isFile: Function, isDirectory: Function, size: number, mtime: number}>}
 */
export async function stat(path) {
  // Special case: /connections root
  if (path === CONNECTIONS_PREFIX || path === CONNECTIONS_PREFIX + '/') {
    return {
      isFile: () => false,
      isDirectory: () => true,
      size: 0,
      mtime: Date.now()
    };
  }
  
  const parsed = parseMountPath(path);
  if (!parsed) {
    throw new Error(`Invalid connections path: ${path}`);
  }
  
  const mount = await getMountByName(parsed.mountName);
  if (!mount) {
    throw new Error(`Mount not found: ${parsed.mountName}`);
  }
  
  const rootHandle = await retrieveHandle(mount.id);
  if (!rootHandle) {
    throw new Error(`Handle not found for mount: ${parsed.mountName}`);
  }
  
  if (!await ensurePermission(rootHandle)) {
    throw new Error(`Permission denied for: ${parsed.mountName}`);
  }
  
  // Handle file mounts
  if (mount.kind === 'file') {
    if (parsed.relativePath) {
      throw new Error(`Cannot stat subpath of file mount: ${path}`);
    }
    const file = await rootHandle.getFile();
    return {
      isFile: () => true,
      isDirectory: () => false,
      size: file.size,
      mtime: file.lastModified
    };
  }
  
  // Handle directory mounts
  if (!parsed.relativePath) {
    // Mount root is a directory
    return {
      isFile: () => false,
      isDirectory: () => true,
      size: 0,
      mtime: mount.connectedAt
    };
  }
  
  const { handle, kind } = await getHandleAtPath(rootHandle, parsed.relativePath);
  
  if (kind === 'file') {
    const file = await handle.getFile();
    return {
      isFile: () => true,
      isDirectory: () => false,
      size: file.size,
      mtime: file.lastModified
    };
  }
  
  return {
    isFile: () => false,
    isDirectory: () => true,
    size: 0,
    mtime: Date.now()
  };
}

/**
 * Create a directory under /connections
 * @param {string} path
 */
export async function mkdir(path) {
  const parsed = parseMountPath(path);
  if (!parsed || !parsed.relativePath) {
    throw new Error(`Cannot create directory at mount root: ${path}`);
  }
  
  const mount = await getMountByName(parsed.mountName);
  if (!mount) {
    throw new Error(`Mount not found: ${parsed.mountName}`);
  }
  
  if (mount.kind === 'file') {
    throw new Error(`Cannot create directory in file mount: ${path}`);
  }
  
  const rootHandle = await retrieveHandle(mount.id);
  if (!rootHandle) {
    throw new Error(`Handle not found for mount: ${parsed.mountName}`);
  }
  
  if (!await ensurePermission(rootHandle)) {
    throw new Error(`Permission denied for: ${parsed.mountName}`);
  }
  
  const parts = parsed.relativePath.split('/').filter(Boolean);
  let current = rootHandle;
  
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create: true });
  }
}

/**
 * Delete a file under /connections
 * @param {string} path
 */
export async function deleteFile(path) {
  const parsed = parseMountPath(path);
  if (!parsed) {
    throw new Error(`Invalid connections path: ${path}`);
  }
  
  const mount = await getMountByName(parsed.mountName);
  if (!mount) {
    throw new Error(`Mount not found: ${parsed.mountName}`);
  }
  
  // If deleting a mount point itself, disconnect it
  if (!parsed.relativePath) {
    await disconnect(mount.id);
    return;
  }
  
  if (mount.kind === 'file') {
    throw new Error(`Cannot delete subpath of file mount: ${path}`);
  }
  
  const rootHandle = await retrieveHandle(mount.id);
  if (!rootHandle) {
    throw new Error(`Handle not found for mount: ${parsed.mountName}`);
  }
  
  if (!await ensurePermission(rootHandle)) {
    throw new Error(`Permission denied for: ${parsed.mountName}`);
  }
  
  const parts = parsed.relativePath.split('/').filter(Boolean);
  const targetName = parts.pop();
  
  if (!targetName) {
    throw new Error(`Invalid path: ${path}`);
  }
  
  // Navigate to parent directory
  let dirHandle = rootHandle;
  for (const part of parts) {
    dirHandle = await dirHandle.getDirectoryHandle(part);
  }
  
  await dirHandle.removeEntry(targetName);
}

/**
 * Remove a directory under /connections
 * @param {string} path
 * @param {Object} [options]
 * @param {boolean} [options.recursive=false]
 */
export async function rmdir(path, options = {}) {
  const parsed = parseMountPath(path);
  if (!parsed) {
    throw new Error(`Invalid connections path: ${path}`);
  }
  
  const mount = await getMountByName(parsed.mountName);
  if (!mount) {
    throw new Error(`Mount not found: ${parsed.mountName}`);
  }
  
  // If removing a mount point itself, disconnect it
  if (!parsed.relativePath) {
    await disconnect(mount.id);
    return;
  }
  
  if (mount.kind === 'file') {
    throw new Error(`Cannot rmdir on file mount: ${path}`);
  }
  
  const rootHandle = await retrieveHandle(mount.id);
  if (!rootHandle) {
    throw new Error(`Handle not found for mount: ${parsed.mountName}`);
  }
  
  if (!await ensurePermission(rootHandle)) {
    throw new Error(`Permission denied for: ${parsed.mountName}`);
  }
  
  const parts = parsed.relativePath.split('/').filter(Boolean);
  const targetName = parts.pop();
  
  if (!targetName) {
    throw new Error(`Invalid path: ${path}`);
  }
  
  let dirHandle = rootHandle;
  for (const part of parts) {
    dirHandle = await dirHandle.getDirectoryHandle(part);
  }
  
  await dirHandle.removeEntry(targetName, { recursive: options.recursive });
}

/**
 * Read JSON file from /connections
 * @param {string} path
 * @returns {Promise<any|null>}
 */
export async function readJSON(path) {
  try {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Write JSON file to /connections
 * @param {string} path
 * @param {any} data
 */
export async function writeJSON(path, data) {
  await writeFile(path, JSON.stringify(data, null, 2));
}
