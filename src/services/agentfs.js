/**
 * AgentFS Service
 * Core OS filesystem using Turso AgentFS (browser version)
 * Provides persistent KV store and filesystem for ClawdOS
 * 
 * @see https://docs.turso.tech/agentfs/sdk/typescript
 * 
 * Vendor dependencies (~9.5MB total, ~3.1MB gzipped):
 * - database-wasm.js: SQLite WASM implementation
 * - agentfs-browser.js: AgentFS SDK
 * - buffer.js: Buffer polyfill
 */

// Vendored paths (relative from services/)
const DATABASE_WASM_PATH = '../vendor/database-wasm.js';
const AGENTFS_PATH = '../vendor/agentfs-browser.js';
const AGENT_ID = 'clawd-os';

/** @type {any} */
let agent = null;
let db = null;
let initPromise = null;

/**
 * Default OS configuration
 */
const DEFAULT_CONFIG = {
  version: '1.0.0',
  theme: 'dark',
  voice: {
    provider: 'native',
    character: 'her',
    rate: 1.0,
    pitch: 1.0
  },
  audio: {
    haptics: true,
    chimes: true
  },
  display: {
    wakeLock: true,
    animations: true
  }
};

/**
 * Create initial user data
 * @returns {Object}
 */
function createUserData() {
  const now = Date.now();
  return {
    firstUsage: now,
    lastUsage: now,
    sessionCount: 1
  };
}

/**
 * Initialize AgentFS
 * @returns {Promise<any>}
 */
async function init() {
  if (agent) return agent;
  
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      console.log('[AgentFS] Initializing...');
      
      // 1. Import Database WASM (SQLite for browser)
      console.log('[AgentFS] Loading SQLite WASM...');
      const { Database } = await import(/* @vite-ignore */ DATABASE_WASM_PATH);
      
      // 2. Create/open the database (in-memory with IndexedDB persistence via OPFS)
      // For browser, we use ':memory:' with OPFS for persistence
      db = new Database(`:memory:?vfs=opfs&_journal=wal&_synchronous=normal`);
      await db.connect();
      console.log('[AgentFS] SQLite connected');
      
      // 3. Import AgentFS and initialize with the database
      const { AgentFS } = await import(/* @vite-ignore */ AGENTFS_PATH);
      agent = await AgentFS.openWith(db);
      console.log('[AgentFS] Connected:', AGENT_ID);
      
      // Bootstrap filesystem on first run
      await bootstrap();
      
      // Update lastUsage on each init
      await updateLastUsage();
      
      return agent;
    } catch (err) {
      console.error('[AgentFS] Init failed:', err);
      initPromise = null;
      throw err;
    }
  })();
  
  return initPromise;
}

/**
 * Check if file exists using stat
 * @param {string} path
 * @returns {Promise<boolean>}
 */
async function fileExists(path) {
  try {
    await agent.fs.stat(path);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}

/**
 * Bootstrap filesystem with default files
 */
async function bootstrap() {
  // Create /config.json if not exists
  if (!(await fileExists('/config.json'))) {
    await agent.fs.writeFile('/config.json', JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log('[AgentFS] Created /config.json');
  }
  
  // Create /user.json if not exists
  if (!(await fileExists('/user.json'))) {
    await agent.fs.writeFile('/user.json', JSON.stringify(createUserData(), null, 2));
    console.log('[AgentFS] Created /user.json');
  }
}

/**
 * Update lastUsage timestamp
 */
async function updateLastUsage() {
  const userData = await readJSON('/user.json');
  if (userData) {
    userData.lastUsage = Date.now();
    userData.sessionCount = (userData.sessionCount || 0) + 1;
    await writeJSON('/user.json', userData);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API - Filesystem
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read JSON file
 * @param {string} path - File path
 * @returns {Promise<any | null>}
 */
export async function readJSON(path) {
  await init();
  try {
    const content = await agent.fs.readFile(path, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    console.error('[AgentFS] readJSON failed:', path, err);
    return null;
  }
}

/**
 * Write JSON file
 * @param {string} path - File path
 * @param {any} data - Data to write
 */
export async function writeJSON(path, data) {
  await init();
  try {
    await agent.fs.writeFile(path, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[AgentFS] writeJSON failed:', path, err);
    throw err;
  }
}

/**
 * Read file contents
 * @param {string} path - File path
 * @param {BufferEncoding} [encoding] - Optional encoding
 * @returns {Promise<Buffer | string | null>}
 */
export async function readFile(path, encoding) {
  await init();
  try {
    return await agent.fs.readFile(path, encoding);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    console.error('[AgentFS] readFile failed:', path, err);
    return null;
  }
}

/**
 * Write file contents
 * @param {string} path - File path
 * @param {string | Buffer} data - Data to write
 */
export async function writeFile(path, data) {
  await init();
  try {
    await agent.fs.writeFile(path, data);
  } catch (err) {
    console.error('[AgentFS] writeFile failed:', path, err);
    throw err;
  }
}

/**
 * Check if file exists
 * @param {string} path - File path
 * @returns {Promise<boolean>}
 */
export async function exists(path) {
  await init();
  try {
    await agent.fs.stat(path);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}

/**
 * Delete file
 * @param {string} path - File path
 */
export async function deleteFile(path) {
  await init();
  try {
    await agent.fs.unlink(path);
  } catch (err) {
    console.error('[AgentFS] deleteFile failed:', path, err);
    throw err;
  }
}

/**
 * List directory contents
 * @param {string} path - Directory path
 * @returns {Promise<string[]>}
 */
export async function readdir(path) {
  await init();
  try {
    return await agent.fs.readdir(path);
  } catch (err) {
    console.error('[AgentFS] readdir failed:', path, err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API - Key-Value Store
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get value from KV store
 * @template T
 * @param {string} key - Key
 * @returns {Promise<T | undefined>}
 */
export async function kvGet(key) {
  await init();
  try {
    return await agent.kv.get(key);
  } catch (err) {
    console.error('[AgentFS] kvGet failed:', key, err);
    return undefined;
  }
}

/**
 * Set value in KV store
 * @param {string} key - Key
 * @param {any} value - Value
 */
export async function kvSet(key, value) {
  await init();
  try {
    await agent.kv.set(key, value);
  } catch (err) {
    console.error('[AgentFS] kvSet failed:', key, err);
    throw err;
  }
}

/**
 * Delete key from KV store
 * @param {string} key - Key
 */
export async function kvDelete(key) {
  await init();
  try {
    await agent.kv.delete(key);
  } catch (err) {
    console.error('[AgentFS] kvDelete failed:', key, err);
    throw err;
  }
}

/**
 * List keys by prefix
 * @param {string} prefix - Key prefix
 * @returns {Promise<Array<{key: string, value: any}>>}
 */
export async function kvList(prefix) {
  await init();
  try {
    return await agent.kv.list(prefix);
  } catch (err) {
    console.error('[AgentFS] kvList failed:', prefix, err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API - Config & User helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get OS configuration
 * @returns {Promise<typeof DEFAULT_CONFIG>}
 */
export async function getConfig() {
  const config = await readJSON('/config.json');
  return config || DEFAULT_CONFIG;
}

/**
 * Update OS configuration (partial)
 * @param {Partial<typeof DEFAULT_CONFIG>} updates - Config updates
 */
export async function updateConfig(updates) {
  const config = await getConfig();
  const merged = deepMerge(config, updates);
  await writeJSON('/config.json', merged);
  return merged;
}

/**
 * Get user data
 * @returns {Promise<ReturnType<typeof createUserData> | null>}
 */
export async function getUser() {
  return readJSON('/user.json');
}

/**
 * Update user data (partial)
 * @param {Object} updates - User updates
 */
export async function updateUser(updates) {
  const user = await getUser();
  if (!user) return null;
  const merged = { ...user, ...updates };
  await writeJSON('/user.json', merged);
  return merged;
}

/**
 * Check if this is a returning user (session count > 1)
 * @returns {Promise<boolean>}
 */
export async function isReturningUser() {
  const user = await getUser();
  return user ? user.sessionCount > 1 : false;
}

/**
 * Get time since first usage (in days)
 * @returns {Promise<number>}
 */
export async function getDaysSinceFirstUsage() {
  const user = await getUser();
  if (!user) return 0;
  return Math.floor((Date.now() - user.firstUsage) / (1000 * 60 * 60 * 24));
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deep merge objects
 * @param {Object} target
 * @param {Object} source
 * @returns {Object}
 */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Initialize AgentFS (call early in app lifecycle)
 */
export { init };

/**
 * Get raw AgentFS instance (for advanced usage)
 * @returns {Promise<import('agentfs-sdk').AgentFS>}
 */
export async function getAgent() {
  await init();
  return agent;
}

// Export default config for reference
export { DEFAULT_CONFIG };
