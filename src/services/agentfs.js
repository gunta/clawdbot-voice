/**
 * AgentFS Service
 * Core OS filesystem using Turso AgentFS (browser version)
 * Provides persistent KV store and filesystem for ClawdOS
 * 
 * @see https://docs.turso.tech/agentfs/sdk/typescript
 * 
 * IMPORTANT: All folder/file names must be VOICE-NATURAL
 * They must sound natural when spoken aloud (e.g., "pictures" not "imgs")
 * 
 * Vendor dependencies (~9.5MB total, ~3.1MB gzipped):
 * - database-wasm.js: SQLite WASM implementation
 * - agentfs-browser.js: AgentFS SDK
 * - buffer.js: Buffer polyfill
 * 
 * Default filesystem structure:
 * /
 * ├── memories/        - Personal moments, things to remember (Her-inspired)
 * ├── notes/           - Quick thoughts, ideas, reminders
 * ├── conversations/   - AI chat history, relationship memory
 * ├── favorites/       - Starred/loved items
 * ├── projects/        - Code and project files
 * ├── documents/       - General documents
 * ├── music/           - Audio files, playlists
 * ├── pictures/        - Photos, images, graphics
 * ├── videos/          - Video files
 * ├── recordings/      - Voice memos, audio notes
 * ├── downloads/       - Downloaded files
 * ├── uploads/         - Files for upload
 * ├── settings/        - System configuration
 * │   ├── config.json  - OS settings
 * │   └── user.json    - User data
 * └── temporary/       - Scratch/temp files
 */

// Vendored paths (relative from services/)
const DATABASE_WASM_PATH = '../vendor/database-wasm.js';
const AGENTFS_PATH = '../vendor/agentfs-browser.js';
const AGENT_ID = 'clawd-os';

// Filesystem paths (voice-natural names - must sound natural when spoken aloud)
const PATHS = {
  CONFIG: '/settings/config.json',
  USER: '/settings/user.json',
  PLUGINS_CONFIG: '/settings/plugins.json',
  SETTINGS_DIR: '/settings',
  PLUGINS_DIR: '/plugins',
  // Default directories (all names must be speakable naturally)
  // Organized by purpose: personal, media, transfers, system
  DIRS: [
    // Personal (Her-inspired, emotional, intimate)
    '/memories',        // "Save this to my memories" - moments, personal history
    '/notes',           // "Take a note" - quick thoughts, ideas, reminders
    '/conversations',   // "Show our conversations" - AI chat history
    '/favorites',       // "Add to favorites" - starred/loved items
    
    // Productivity
    '/projects',        // Code, work, creative projects
    '/documents',       // General documents, files
    
    // Media
    '/music',           // Audio files, playlists
    '/pictures',        // Photos, images, graphics
    '/videos',          // Video files
    '/recordings',      // Voice memos, audio notes
    
    // Transfers
    '/downloads',       // Downloaded files
    '/uploads',         // Files for upload
    
    // System
    '/settings',        // OS configuration
    '/plugins',         // User plugins (skills, agents, components)
    '/temporary'        // Scratch/temp files
  ]
};

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
      const { Database } = await import(DATABASE_WASM_PATH);
      
      // 2. Create/open the database (in-memory with IndexedDB persistence via OPFS)
      // For browser, we use ':memory:' with OPFS for persistence
      db = new Database(`:memory:?vfs=opfs&_journal=wal&_synchronous=normal`);
      await db.connect();
      console.log('[AgentFS] SQLite connected');
      
      // 3. Import AgentFS and initialize with the database
      const { AgentFS } = await import(AGENTFS_PATH);
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
 * Bootstrap filesystem with default directories and files
 */
async function bootstrap() {
  // Create default directories
  for (const dir of PATHS.DIRS) {
    if (!(await fileExists(dir))) {
      try {
        await agent.fs.mkdir(dir);
        console.log('[AgentFS] Created directory:', dir);
      } catch (err) {
        if (err.code !== 'EEXIST') {
          console.error('[AgentFS] Failed to create directory:', dir, err);
        }
      }
    }
  }
  
  // Migrate old config/user files if they exist at root
  await migrateOldFiles();
  
  // Create config.json if not exists
  if (!(await fileExists(PATHS.CONFIG))) {
    await agent.fs.writeFile(PATHS.CONFIG, JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log('[AgentFS] Created', PATHS.CONFIG);
  }
  
  // Create user.json if not exists
  if (!(await fileExists(PATHS.USER))) {
    await agent.fs.writeFile(PATHS.USER, JSON.stringify(createUserData(), null, 2));
    console.log('[AgentFS] Created', PATHS.USER);
  }
}

/**
 * Migrate old files from root to settings folder
 */
async function migrateOldFiles() {
  // Migrate /config.json to /settings/config.json
  if (await fileExists('/config.json') && !(await fileExists(PATHS.CONFIG))) {
    try {
      const content = await agent.fs.readFile('/config.json', 'utf-8');
      await agent.fs.writeFile(PATHS.CONFIG, content);
      await agent.fs.unlink('/config.json');
      console.log('[AgentFS] Migrated /config.json to', PATHS.CONFIG);
    } catch (err) {
      console.error('[AgentFS] Migration failed for config.json:', err);
    }
  }
  
  // Migrate /user.json to /settings/user.json
  if (await fileExists('/user.json') && !(await fileExists(PATHS.USER))) {
    try {
      const content = await agent.fs.readFile('/user.json', 'utf-8');
      await agent.fs.writeFile(PATHS.USER, content);
      await agent.fs.unlink('/user.json');
      console.log('[AgentFS] Migrated /user.json to', PATHS.USER);
    } catch (err) {
      console.error('[AgentFS] Migration failed for user.json:', err);
    }
  }
}

/**
 * Update lastUsage timestamp
 */
async function updateLastUsage() {
  const userData = await readJSON(PATHS.USER);
  if (userData) {
    userData.lastUsage = Date.now();
    userData.sessionCount = (userData.sessionCount || 0) + 1;
    await writeJSON(PATHS.USER, userData);
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
  const config = await readJSON(PATHS.CONFIG);
  return config || DEFAULT_CONFIG;
}

/**
 * Update OS configuration (partial)
 * @param {Partial<typeof DEFAULT_CONFIG>} updates - Config updates
 */
export async function updateConfig(updates) {
  const config = await getConfig();
  const merged = deepMerge(config, updates);
  await writeJSON(PATHS.CONFIG, merged);
  return merged;
}

/**
 * Get user data
 * @returns {Promise<ReturnType<typeof createUserData> | null>}
 */
export async function getUser() {
  return readJSON(PATHS.USER);
}

/**
 * Update user data (partial)
 * @param {Object} updates - User updates
 */
export async function updateUser(updates) {
  const user = await getUser();
  if (!user) return null;
  const merged = { ...user, ...updates };
  await writeJSON(PATHS.USER, merged);
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

/**
 * Get default filesystem paths
 * @returns {typeof PATHS}
 */
export function getPaths() {
  return PATHS;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plugin Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List all plugin directories that have a valid manifest
 * @returns {Promise<string[]>} Array of plugin names
 */
export async function listPlugins() {
  await init();
  try {
    const dirs = await readdir(PATHS.PLUGINS_DIR);
    const validPlugins = [];
    
    for (const dir of dirs) {
      const manifestPath = `${PATHS.PLUGINS_DIR}/${dir}/.claude-plugin/plugin.json`;
      if (await exists(manifestPath)) {
        validPlugins.push(dir);
      }
    }
    
    return validPlugins;
  } catch (err) {
    console.error('[AgentFS] listPlugins failed:', err);
    return [];
  }
}

/**
 * Read a plugin's manifest (plugin.json)
 * @param {string} pluginName - Plugin directory name
 * @returns {Promise<Object|null>}
 */
export async function readPluginManifest(pluginName) {
  const manifestPath = `${PATHS.PLUGINS_DIR}/${pluginName}/.claude-plugin/plugin.json`;
  return readJSON(manifestPath);
}

/**
 * Get plugin configuration (enabled/disabled list)
 * @returns {Promise<{ enabled?: string[], disabled?: string[] }>}
 */
export async function getPluginsConfig() {
  const config = await readJSON(PATHS.PLUGINS_CONFIG);
  return config || {};
}

/**
 * Update plugin configuration
 * @param {Object} updates - Config updates
 * @returns {Promise<Object>}
 */
export async function updatePluginsConfig(updates) {
  const config = await getPluginsConfig();
  const merged = { ...config, ...updates };
  await writeJSON(PATHS.PLUGINS_CONFIG, merged);
  return merged;
}

/**
 * Create a new plugin directory structure
 * @param {string} pluginName - Plugin name
 * @param {Object} manifest - Plugin manifest
 * @returns {Promise<void>}
 */
export async function createPlugin(pluginName, manifest) {
  await init();
  const basePath = `${PATHS.PLUGINS_DIR}/${pluginName}`;
  
  // Create directory structure
  await agent.fs.mkdir(basePath).catch(() => {});
  await agent.fs.mkdir(`${basePath}/.claude-plugin`).catch(() => {});
  await agent.fs.mkdir(`${basePath}/skills`).catch(() => {});
  await agent.fs.mkdir(`${basePath}/commands`).catch(() => {});
  await agent.fs.mkdir(`${basePath}/hooks`).catch(() => {});
  await agent.fs.mkdir(`${basePath}/components`).catch(() => {});
  
  // Write manifest
  await writeJSON(`${basePath}/.claude-plugin/plugin.json`, {
    name: pluginName,
    version: '1.0.0',
    ...manifest,
  });
  
  // Write empty hooks.json
  await writeJSON(`${basePath}/hooks/hooks.json`, { hooks: [] });
  
  console.log('[AgentFS] Created plugin:', pluginName);
}

/**
 * Create directory (wrapper for agent.fs.mkdir)
 * @param {string} path - Directory path
 */
export async function mkdir(path) {
  await init();
  try {
    await agent.fs.mkdir(path);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
}

// Export default config and paths for reference
export { DEFAULT_CONFIG, PATHS };
