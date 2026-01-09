/**
 * wasm-git ES Module Wrapper
 * Vendored from wasm-git@0.0.13
 * 
 * GIT for nodejs and the browser using libgit2 compiled to WebAssembly
 * 
 * @see https://github.com/petersalomonsen/wasm-git
 */

// Import the async version module factory
import lg2Module from './lg2_async.js';

// Cache for the initialized module
let modulePromise = null;
let cachedModule = null;

/**
 * Initialize wasm-git module
 * @returns {Promise<Object>} The initialized lg2 module
 */
export async function initWasmGit() {
  if (cachedModule) return cachedModule;
  
  if (!modulePromise) {
    modulePromise = lg2Module({
      locateFile: (path) => {
        // Point to the vendored wasm file
        if (path.endsWith('.wasm')) {
          return new URL('./lg2_async.wasm', import.meta.url).href;
        }
        return path;
      }
    }).then(module => {
      cachedModule = module;
      return module;
    });
  }
  
  return modulePromise;
}

/**
 * Create a new git repository in the filesystem
 * @param {Object} FS - The Emscripten filesystem
 * @param {Object} lg2 - The initialized wasm-git module
 * @param {string} repoPath - Path to create the repo at
 */
export async function gitInit(FS, lg2, repoPath) {
  await lg2.callMain(['init', repoPath]);
}

/**
 * Clone a repository
 * @param {Object} FS - The Emscripten filesystem
 * @param {Object} lg2 - The initialized wasm-git module
 * @param {string} url - Repository URL
 * @param {string} destPath - Destination path
 */
export async function gitClone(FS, lg2, url, destPath) {
  await lg2.callMain(['clone', url, destPath]);
}

/**
 * Get repository status
 * @param {Object} lg2 - The initialized wasm-git module
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<string>} Status output
 */
export async function gitStatus(lg2, repoPath) {
  const oldCwd = lg2.FS.cwd();
  lg2.FS.chdir(repoPath);
  try {
    return await lg2.callMain(['status']);
  } finally {
    lg2.FS.chdir(oldCwd);
  }
}

/**
 * Add files to staging
 * @param {Object} lg2 - The initialized wasm-git module
 * @param {string} repoPath - Path to the repository
 * @param {string[]} files - Files to add
 */
export async function gitAdd(lg2, repoPath, files) {
  const oldCwd = lg2.FS.cwd();
  lg2.FS.chdir(repoPath);
  try {
    await lg2.callMain(['add', ...files]);
  } finally {
    lg2.FS.chdir(oldCwd);
  }
}

/**
 * Commit staged changes
 * @param {Object} lg2 - The initialized wasm-git module
 * @param {string} repoPath - Path to the repository
 * @param {string} message - Commit message
 */
export async function gitCommit(lg2, repoPath, message) {
  const oldCwd = lg2.FS.cwd();
  lg2.FS.chdir(repoPath);
  try {
    await lg2.callMain(['commit', '-m', message]);
  } finally {
    lg2.FS.chdir(oldCwd);
  }
}

/**
 * Get git log
 * @param {Object} lg2 - The initialized wasm-git module
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<string>} Log output
 */
export async function gitLog(lg2, repoPath) {
  const oldCwd = lg2.FS.cwd();
  lg2.FS.chdir(repoPath);
  try {
    return await lg2.callMain(['log']);
  } finally {
    lg2.FS.chdir(oldCwd);
  }
}

// Default export
export default initWasmGit;
