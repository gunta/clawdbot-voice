/**
 * xterm.js ES Module Wrapper
 * Vendored from @xterm/xterm@5.5.0
 * 
 * This wrapper provides ES module exports for the UMD xterm.js bundle.
 * 
 * @see https://github.com/xtermjs/xterm.js
 */

// Load xterm.js UMD bundle - creates globalThis.Terminal
import './xterm.js';

// Load addons
import './addon-fit.js';
import './addon-web-links.js';

// Re-export as ES modules
export const Terminal = globalThis.Terminal;
export const FitAddon = globalThis.FitAddon?.FitAddon || globalThis.FitAddon;
export const WebLinksAddon = globalThis.WebLinksAddon?.WebLinksAddon || globalThis.WebLinksAddon;

// Default export
export default Terminal;
