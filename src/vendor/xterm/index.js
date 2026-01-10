/**
 * xterm.js ES Module Wrapper
 * Vendored from @xterm/xterm@5.5.0
 *
 * This wrapper provides ES module exports for the UMD xterm.js bundle.
 * Disables AMD detection to avoid conflicts with Monaco's AMD loader.
 *
 * @see https://github.com/xtermjs/xterm.js
 */

// Store and disable AMD define to avoid conflicts with Monaco
const originalDefine = globalThis.define;
globalThis.define = undefined;

// Load xterm.js UMD bundle - creates globalThis.Terminal
await import('./xterm.js');

// Load addons
await import('./addon-fit.js');
await import('./addon-web-links.js');

// Restore AMD define
globalThis.define = originalDefine;

// Re-export as ES modules
export const Terminal = globalThis.Terminal;
export const FitAddon = globalThis.FitAddon?.FitAddon || globalThis.FitAddon;
export const WebLinksAddon = globalThis.WebLinksAddon?.WebLinksAddon || globalThis.WebLinksAddon;

// Default export
export default Terminal;
