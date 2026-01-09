/**
 * Commands App Component
 * Terminal interface with AgentFS filesystem and Git support
 * Uses xterm.js for terminal emulation
 * 
 * Supports comprehensive bash commands:
 * - File operations: ls, cd, cat, mkdir, rm, touch, cp, mv, ln, stat, file, tree, find
 * - Text processing: grep, head, tail, wc, sort, uniq, cut, tr, base64, diff
 * - Shell features: pipes (|), redirections (>, >>), environment variables
 * - Utilities: echo, printf, date, env, export, which, seq, basename, dirname, tee
 */

import { agentfs, appContext, systemSounds } from '../services/index.js';

// Lazy load xterm.js
let Terminal, FitAddon, WebLinksAddon;

export class CommandsApp extends HTMLElement {
  #terminal = null;
  #fitAddon = null;
  #terminalWrapper = null;
  #closeBtn = null;
  #pathDisplay = null;
  #statusBar = null;
  #boundHandleKeyDown = null;
  #boundHandleResize = null;
  
  // Shell state
  #cwd = '/';
  #commandHistory = [];
  #historyIndex = -1;
  #currentLine = '';
  #cursorPosition = 0;
  #isProcessing = false;
  
  // Environment variables (voice-natural names)
  #env = {
    HOME: '/projects',
    USER: 'clawd',
    SHELL: '/bin/bash',
    PWD: '/',
    PATH: '/bin:/usr/bin',
    TERM: 'xterm-256color',
    LANG: 'en_US.UTF-8',
    // Default directories (all voice-natural)
    // Personal
    MEMORIES: '/memories',
    NOTES: '/notes',
    CONVERSATIONS: '/conversations',
    FAVORITES: '/favorites',
    // Productivity
    PROJECTS: '/projects',
    DOCUMENTS: '/documents',
    // Media
    MUSIC: '/music',
    PICTURES: '/pictures',
    VIDEOS: '/videos',
    RECORDINGS: '/recordings',
    // Transfers
    DOWNLOADS: '/downloads',
    UPLOADS: '/uploads',
    // System
    SETTINGS: '/settings',
    TEMPORARY: '/temporary',
    TMPDIR: '/temporary'
  };
  
  // Aliases
  #aliases = {
    'll': 'ls -la',
    'la': 'ls -a',
    'l': 'ls -l',
    '..': 'cd ..',
    '...': 'cd ../..'
  };
  
  // Git state
  #lg2 = null;
  #gitInitialized = false;

  connectedCallback() {
    this.#terminalWrapper = this.shadowRoot?.querySelector('.terminal-wrapper');
    this.#closeBtn = this.shadowRoot?.querySelector('.close-btn');
    this.#pathDisplay = this.shadowRoot?.querySelector('.path-display');
    this.#statusBar = this.shadowRoot?.querySelector('.status-bar');
    
    // Event handlers
    this.#closeBtn?.addEventListener('click', () => this.close());
    this.#boundHandleKeyDown = this.#handleKeyDown.bind(this);
    this.#boundHandleResize = this.#handleResize.bind(this);
    
    // Back button handler
    const backBtn = this.shadowRoot?.querySelector('.back-btn');
    backBtn?.addEventListener('click', () => this.#navigateUp());
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this.#boundHandleKeyDown);
    window.removeEventListener('resize', this.#boundHandleResize);
    this.#terminal?.dispose();
  }

  /**
   * Open the commands app
   */
  async open() {
    this.setAttribute('open', '');
    document.addEventListener('keydown', this.#boundHandleKeyDown);
    window.addEventListener('resize', this.#boundHandleResize);
    
    // Play open sound
    systemSounds.open();
    
    // Initialize terminal if not already
    if (!this.#terminal) {
      await this.#initTerminal();
    }
    
    // Focus terminal
    requestAnimationFrame(() => {
      this.#terminal?.focus();
      this.#fitAddon?.fit();
    });
    
    this.dispatchEvent(new CustomEvent('commands-app-open', { bubbles: true }));
  }

  /**
   * Close the commands app
   */
  close() {
    this.removeAttribute('open');
    document.removeEventListener('keydown', this.#boundHandleKeyDown);
    window.removeEventListener('resize', this.#boundHandleResize);
    
    // Play close sound
    systemSounds.close();
    
    this.dispatchEvent(new CustomEvent('commands-app-close', { bubbles: true }));
  }

  /**
   * Initialize xterm.js terminal
   */
  async #initTerminal() {
    if (!this.#terminalWrapper) return;
    
    try {
      // Dynamically import xterm.js
      const xterm = await import('../vendor/xterm/index.js');
      Terminal = xterm.Terminal;
      FitAddon = xterm.FitAddon;
      WebLinksAddon = xterm.WebLinksAddon;
      
      // Load xterm CSS
      await this.#loadXtermStyles();
      
      // Create terminal with Her aesthetic theme
      this.#terminal = new Terminal({
        fontFamily: "'SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', monospace",
        fontSize: 13,
        lineHeight: 1.4,
        cursorBlink: true,
        cursorStyle: 'block',
        theme: {
          background: '#1a1512',
          foreground: '#e8e4e0',
          cursor: '#C84536',
          cursorAccent: '#1a1512',
          selection: 'rgba(200, 69, 54, 0.3)',
          black: '#1a1512',
          red: '#C84536',
          green: '#6B9E78',
          yellow: '#D4A574',
          blue: '#6B8E9E',
          magenta: '#9E6B8E',
          cyan: '#6B9E9E',
          white: '#e8e4e0',
          brightBlack: '#4a4540',
          brightRed: '#E86B5C',
          brightGreen: '#8EBE98',
          brightYellow: '#E8C594',
          brightBlue: '#8EAEBE',
          brightMagenta: '#BE8EAE',
          brightCyan: '#8EBEBE',
          brightWhite: '#ffffff'
        }
      });
      
      // Load addons
      this.#fitAddon = new FitAddon();
      this.#terminal.loadAddon(this.#fitAddon);
      
      if (WebLinksAddon) {
        this.#terminal.loadAddon(new WebLinksAddon());
      }
      
      // Open terminal in container
      this.#terminal.open(this.#terminalWrapper);
      this.#fitAddon.fit();
      
      // Set up input handling
      this.#terminal.onData((data) => this.#handleInput(data));
      
      // Initialize AgentFS
      await agentfs.init();
      
      // Show welcome message and prompt
      this.#showWelcome();
      this.#showPrompt();
      
      // Update path display
      this.#updatePathDisplay();
      
    } catch (err) {
      console.error('[CommandsApp] Failed to initialize terminal:', err);
    }
  }

  /**
   * Load xterm.js styles into shadow DOM
   */
  async #loadXtermStyles() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'src/vendor/xterm/xterm.css';
    this.shadowRoot?.appendChild(link);
    
    // Wait for styles to load
    await new Promise(resolve => {
      link.onload = resolve;
      link.onerror = resolve;
    });
  }

  /**
   * Show welcome message
   */
  #showWelcome() {
    const welcomeText = `
\x1b[38;2;107;158;126mCLAWD OS1\x1b[0m \x1b[38;2;138;134;130mTerminal\x1b[0m
\x1b[38;2;100;96;92mType 'help' for available commands\x1b[0m

`;
    this.#terminal?.write(welcomeText);
  }

  /**
   * Show command prompt
   */
  #showPrompt() {
    const shortPath = this.#cwd === '/' ? '/' : this.#cwd.split('/').pop() || '/';
    const prompt = `\x1b[38;2;107;158;126m${shortPath}\x1b[0m \x1b[38;2;200;69,54m❯\x1b[0m `;
    this.#terminal?.write(prompt);
    this.#currentLine = '';
    this.#cursorPosition = 0;
  }

  /**
   * Handle terminal input
   */
  #handleInput(data) {
    if (this.#isProcessing) return;
    
    const code = data.charCodeAt(0);
    
    // Enter key
    if (data === '\r') {
      this.#terminal?.write('\r\n');
      this.#executeCommand(this.#currentLine.trim());
      return;
    }
    
    // Backspace
    if (data === '\x7f' || data === '\b') {
      if (this.#cursorPosition > 0) {
        this.#currentLine = 
          this.#currentLine.slice(0, this.#cursorPosition - 1) + 
          this.#currentLine.slice(this.#cursorPosition);
        this.#cursorPosition--;
        this.#terminal?.write('\b \b');
      }
      return;
    }
    
    // Arrow keys
    if (data === '\x1b[A') { // Up arrow - history
      if (this.#historyIndex < this.#commandHistory.length - 1) {
        this.#historyIndex++;
        this.#setCurrentLine(this.#commandHistory[this.#commandHistory.length - 1 - this.#historyIndex]);
      }
      return;
    }
    
    if (data === '\x1b[B') { // Down arrow - history
      if (this.#historyIndex > 0) {
        this.#historyIndex--;
        this.#setCurrentLine(this.#commandHistory[this.#commandHistory.length - 1 - this.#historyIndex]);
      } else if (this.#historyIndex === 0) {
        this.#historyIndex = -1;
        this.#setCurrentLine('');
      }
      return;
    }
    
    // Tab completion
    if (data === '\t') {
      this.#handleTabCompletion();
      return;
    }
    
    // Ctrl+C
    if (data === '\x03') {
      this.#terminal?.write('^C\r\n');
      this.#showPrompt();
      return;
    }
    
    // Ctrl+L - clear screen
    if (data === '\x0c') {
      this.#terminal?.clear();
      this.#showPrompt();
      return;
    }
    
    // Regular printable characters
    if (code >= 32) {
      this.#currentLine = 
        this.#currentLine.slice(0, this.#cursorPosition) + 
        data + 
        this.#currentLine.slice(this.#cursorPosition);
      this.#cursorPosition += data.length;
      this.#terminal?.write(data);
    }
  }

  /**
   * Set current line (for history navigation)
   */
  #setCurrentLine(line) {
    // Clear current line
    const clearLen = this.#currentLine.length;
    this.#terminal?.write('\b'.repeat(this.#cursorPosition));
    this.#terminal?.write(' '.repeat(clearLen));
    this.#terminal?.write('\b'.repeat(clearLen));
    
    // Write new line
    this.#currentLine = line;
    this.#cursorPosition = line.length;
    this.#terminal?.write(line);
  }

  /**
   * Handle tab completion
   */
  async #handleTabCompletion() {
    const parts = this.#currentLine.split(' ');
    const lastPart = parts[parts.length - 1];
    
    try {
      // Get directory listing
      const dirPath = lastPart.includes('/') 
        ? this.#resolvePath(lastPart.substring(0, lastPart.lastIndexOf('/'))) || this.#cwd
        : this.#cwd;
      
      const prefix = lastPart.includes('/') 
        ? lastPart.substring(lastPart.lastIndexOf('/') + 1)
        : lastPart;
      
      const entries = await agentfs.readdir(dirPath);
      const matches = entries.filter(e => e.startsWith(prefix));
      
      if (matches.length === 1) {
        // Complete the name
        const completion = matches[0].substring(prefix.length);
        this.#currentLine += completion;
        this.#cursorPosition += completion.length;
        this.#terminal?.write(completion);
      } else if (matches.length > 1) {
        // Show options
        this.#terminal?.write('\r\n');
        this.#terminal?.write(matches.join('  '));
        this.#terminal?.write('\r\n');
        this.#showPrompt();
        this.#terminal?.write(this.#currentLine);
      }
    } catch (err) {
      // Ignore completion errors
    }
  }

  /**
   * Execute a command line (supports pipes and redirections)
   */
  async #executeCommand(input) {
    if (!input) {
      this.#showPrompt();
      return;
    }
    
    // Add to history
    if (input !== this.#commandHistory[this.#commandHistory.length - 1]) {
      this.#commandHistory.push(input);
    }
    this.#historyIndex = -1;
    
    this.#isProcessing = true;
    
    try {
      // Expand aliases
      const expandedInput = this.#expandAlias(input);
      
      // Expand environment variables
      const processedInput = this.#expandEnvVars(expandedInput);
      
      // Check for command chaining (&&, ||, ;)
      const chainedCommands = this.#parseChainedCommands(processedInput);
      
      for (const chainPart of chainedCommands) {
        const { cmd, operator, prevExitCode } = chainPart;
        
        // Handle && and || logic
        if (operator === '&&' && prevExitCode !== 0) continue;
        if (operator === '||' && prevExitCode === 0) continue;
        
        // Parse pipes
        const pipeSegments = this.#parsePipes(cmd);
        
        let pipeInput = '';
        let lastExitCode = 0;
        
        for (let i = 0; i < pipeSegments.length; i++) {
          const segment = pipeSegments[i].trim();
          if (!segment) continue;
          
          // Parse redirections
          const { command: cmdWithoutRedir, redirections } = this.#parseRedirections(segment);
          
          // Parse command and args
          const parts = this.#parseCommand(cmdWithoutRedir);
          const command = parts[0]?.toLowerCase();
          const args = parts.slice(1);
          
          if (!command) continue;
          
          appContext.recordAction('commands', 'execute', { command, args });
          
          // Execute command and capture output
          const result = await this.#executeBuiltin(command, args, pipeInput);
          
          // Handle redirections
          if (redirections.stdout) {
            await this.#handleRedirection(redirections.stdout, redirections.stdoutAppend, result.stdout);
          } else if (i === pipeSegments.length - 1 && result.stdout) {
            // Only output to terminal on last pipe segment
            this.#terminal?.write(result.stdout.replace(/\n/g, '\r\n'));
            if (!result.stdout.endsWith('\n')) {
              this.#terminal?.write('\r\n');
            }
          }
          
          pipeInput = result.stdout || '';
          lastExitCode = result.exitCode;
          
          if (result.stderr) {
            this.#writeError(result.stderr);
          }
        }
        
        chainPart.prevExitCode = lastExitCode;
      }
    } catch (err) {
      this.#writeError(err.message || String(err));
    } finally {
      this.#isProcessing = false;
      this.#showPrompt();
    }
  }
  
  /**
   * Execute a builtin command
   * @returns {{ stdout: string, stderr: string, exitCode: number }}
   */
  async #executeBuiltin(command, args, stdin = '') {
    try {
      switch (command) {
        // Shell builtins
        case 'help':
          return { stdout: this.#getHelpText(), stderr: '', exitCode: 0 };
        case 'clear':
        case 'cls':
          this.#terminal?.clear();
          return { stdout: '', stderr: '', exitCode: 0 };
        case 'pwd':
          return { stdout: this.#cwd + '\n', stderr: '', exitCode: 0 };
        case 'cd':
          return await this.#cmdCd(args[0]);
        case 'exit':
          this.close();
          return { stdout: '', stderr: '', exitCode: 0 };
        
        // File operations
        case 'ls':
          return await this.#cmdLs(args);
        case 'cat':
          return await this.#cmdCat(args, stdin);
        case 'mkdir':
          return await this.#cmdMkdir(args);
        case 'rm':
          return await this.#cmdRm(args);
        case 'rmdir':
          return await this.#cmdRmdir(args);
        case 'touch':
          return await this.#cmdTouch(args);
        case 'cp':
          return await this.#cmdCp(args);
        case 'mv':
          return await this.#cmdMv(args);
        case 'ln':
          return await this.#cmdLn(args);
        case 'stat':
          return await this.#cmdStat(args);
        case 'file':
          return await this.#cmdFile(args);
        case 'tree':
          return await this.#cmdTree(args);
        case 'find':
          return await this.#cmdFind(args);
        case 'du':
          return await this.#cmdDu(args);
        
        // Text processing
        case 'echo':
          return this.#cmdEcho(args);
        case 'printf':
          return this.#cmdPrintf(args);
        case 'grep':
        case 'egrep':
        case 'fgrep':
          return await this.#cmdGrep(args, stdin, command);
        case 'head':
          return await this.#cmdHead(args, stdin);
        case 'tail':
          return await this.#cmdTail(args, stdin);
        case 'wc':
          return await this.#cmdWc(args, stdin);
        case 'sort':
          return await this.#cmdSort(args, stdin);
        case 'uniq':
          return this.#cmdUniq(args, stdin);
        case 'cut':
          return this.#cmdCut(args, stdin);
        case 'tr':
          return this.#cmdTr(args, stdin);
        case 'rev':
          return this.#cmdRev(stdin);
        case 'tac':
          return this.#cmdTac(stdin);
        case 'base64':
          return this.#cmdBase64(args, stdin);
        case 'md5sum':
        case 'sha1sum':
        case 'sha256sum':
          return await this.#cmdChecksum(args, stdin, command);
        case 'diff':
          return await this.#cmdDiff(args);
        case 'nl':
          return this.#cmdNl(args, stdin);
        case 'fold':
          return this.#cmdFold(args, stdin);
        case 'expand':
          return this.#cmdExpand(args, stdin);
        case 'unexpand':
          return this.#cmdUnexpand(args, stdin);
        case 'strings':
          return await this.#cmdStrings(args, stdin);
        
        // Environment & utilities
        case 'env':
        case 'printenv':
          return this.#cmdEnv(args);
        case 'export':
          return this.#cmdExport(args);
        case 'unset':
          return this.#cmdUnset(args);
        case 'alias':
          return this.#cmdAlias(args);
        case 'unalias':
          return this.#cmdUnalias(args);
        case 'which':
          return this.#cmdWhich(args);
        case 'type':
          return this.#cmdType(args);
        case 'whoami':
          return { stdout: this.#env.USER + '\n', stderr: '', exitCode: 0 };
        case 'hostname':
          return { stdout: 'clawdos\n', stderr: '', exitCode: 0 };
        case 'date':
          return this.#cmdDate(args);
        case 'history':
          return this.#cmdHistory(args);
        case 'seq':
          return this.#cmdSeq(args);
        case 'basename':
          return this.#cmdBasename(args);
        case 'dirname':
          return this.#cmdDirname(args);
        case 'realpath':
        case 'readlink':
          return this.#cmdRealpath(args);
        case 'tee':
          return await this.#cmdTee(args, stdin);
        case 'xargs':
          return await this.#cmdXargs(args, stdin);
        case 'sleep':
          return await this.#cmdSleep(args);
        case 'true':
          return { stdout: '', stderr: '', exitCode: 0 };
        case 'false':
          return { stdout: '', stderr: '', exitCode: 1 };
        case 'yes':
          return this.#cmdYes(args);
        case 'expr':
          return this.#cmdExpr(args);
        
        // Git
        case 'git':
          return await this.#cmdGit(args);
        
        default:
          return { stdout: '', stderr: `${command}: command not found`, exitCode: 127 };
      }
    } catch (err) {
      return { stdout: '', stderr: err.message || String(err), exitCode: 1 };
    }
  }

  /**
   * Parse command into parts (handles quotes and escapes)
   */
  #parseCommand(input) {
    const parts = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';
    let escape = false;
    
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      
      if (escape) {
        current += char;
        escape = false;
        continue;
      }
      
      if (char === '\\' && !inQuote) {
        escape = true;
        continue;
      }
      
      if ((char === '"' || char === "'") && !inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuote) {
        inQuote = false;
        quoteChar = '';
      } else if (char === ' ' && !inQuote) {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    
    if (current) parts.push(current);
    return parts;
  }
  
  /**
   * Expand alias if exists
   */
  #expandAlias(input) {
    const firstWord = input.split(/\s+/)[0];
    if (this.#aliases[firstWord]) {
      return input.replace(firstWord, this.#aliases[firstWord]);
    }
    return input;
  }
  
  /**
   * Expand environment variables ($VAR, ${VAR}, ${VAR:-default})
   */
  #expandEnvVars(input) {
    // Handle ${VAR:-default} syntax
    let result = input.replace(/\$\{(\w+):-([^}]*)\}/g, (_, name, defaultVal) => {
      return this.#env[name] ?? defaultVal;
    });
    
    // Handle ${VAR} syntax
    result = result.replace(/\$\{(\w+)\}/g, (_, name) => {
      return this.#env[name] ?? '';
    });
    
    // Handle $VAR syntax
    result = result.replace(/\$(\w+)/g, (_, name) => {
      // Special variables
      if (name === '?') return '0'; // Last exit code (simplified)
      if (name === '$') return String(process?.pid || 1);
      if (name === 'PWD') return this.#cwd;
      return this.#env[name] ?? '';
    });
    
    // Handle ~ for home directory
    result = result.replace(/^~(?=\/|$)/, this.#env.HOME || '/');
    
    return result;
  }
  
  /**
   * Parse chained commands (&&, ||, ;)
   */
  #parseChainedCommands(input) {
    const result = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';
    let i = 0;
    let lastOperator = null;
    
    while (i < input.length) {
      const char = input[i];
      const next = input[i + 1];
      
      if ((char === '"' || char === "'") && !inQuote) {
        inQuote = true;
        quoteChar = char;
        current += char;
      } else if (char === quoteChar && inQuote) {
        inQuote = false;
        quoteChar = '';
        current += char;
      } else if (!inQuote) {
        if (char === '&' && next === '&') {
          if (current.trim()) {
            result.push({ cmd: current.trim(), operator: lastOperator, prevExitCode: 0 });
          }
          lastOperator = '&&';
          current = '';
          i += 2;
          continue;
        } else if (char === '|' && next === '|') {
          if (current.trim()) {
            result.push({ cmd: current.trim(), operator: lastOperator, prevExitCode: 0 });
          }
          lastOperator = '||';
          current = '';
          i += 2;
          continue;
        } else if (char === ';') {
          if (current.trim()) {
            result.push({ cmd: current.trim(), operator: lastOperator, prevExitCode: 0 });
          }
          lastOperator = ';';
          current = '';
          i++;
          continue;
        } else {
          current += char;
        }
      } else {
        current += char;
      }
      i++;
    }
    
    if (current.trim()) {
      result.push({ cmd: current.trim(), operator: lastOperator, prevExitCode: 0 });
    }
    
    return result.length ? result : [{ cmd: input, operator: null, prevExitCode: 0 }];
  }
  
  /**
   * Parse pipes
   */
  #parsePipes(input) {
    const segments = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';
    
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const next = input[i + 1];
      
      if ((char === '"' || char === "'") && !inQuote) {
        inQuote = true;
        quoteChar = char;
        current += char;
      } else if (char === quoteChar && inQuote) {
        inQuote = false;
        quoteChar = '';
        current += char;
      } else if (char === '|' && next !== '|' && !inQuote) {
        segments.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current) segments.push(current);
    return segments;
  }
  
  /**
   * Parse redirections (>, >>, <, 2>, 2>&1)
   */
  #parseRedirections(input) {
    let command = input;
    const redirections = {
      stdout: null,
      stdoutAppend: false,
      stderr: null,
      stderrAppend: false,
      stdin: null
    };
    
    // Handle 2>&1 (stderr to stdout)
    command = command.replace(/\s+2>&1\s*$/, '');
    
    // Handle >> (append)
    const appendMatch = command.match(/\s*>>\s*(\S+)\s*$/);
    if (appendMatch) {
      redirections.stdout = appendMatch[1];
      redirections.stdoutAppend = true;
      command = command.replace(/\s*>>\s*\S+\s*$/, '');
    }
    
    // Handle > (overwrite)
    const overwriteMatch = command.match(/\s*>\s*(\S+)\s*$/);
    if (overwriteMatch) {
      redirections.stdout = overwriteMatch[1];
      redirections.stdoutAppend = false;
      command = command.replace(/\s*>\s*\S+\s*$/, '');
    }
    
    // Handle < (stdin)
    const stdinMatch = command.match(/\s*<\s*(\S+)\s*/);
    if (stdinMatch) {
      redirections.stdin = stdinMatch[1];
      command = command.replace(/\s*<\s*\S+\s*/, ' ');
    }
    
    return { command: command.trim(), redirections };
  }
  
  /**
   * Handle output redirection
   */
  async #handleRedirection(path, append, content) {
    const resolvedPath = this.#resolvePath(path);
    try {
      if (append) {
        const existing = await agentfs.readFile(resolvedPath, 'utf-8') || '';
        await agentfs.writeFile(resolvedPath, existing + content);
      } else {
        await agentfs.writeFile(resolvedPath, content);
      }
    } catch (err) {
      this.#writeError(`cannot write to '${path}': ${err.message}`);
    }
  }
  
  /**
   * Parse command-line options (returns { options: {}, args: [] })
   */
  #parseOptions(args, optDefs = {}) {
    const options = {};
    const remaining = [];
    
    // Set defaults
    for (const [key, def] of Object.entries(optDefs)) {
      if (def.default !== undefined) {
        options[key] = def.default;
      }
    }
    
    let i = 0;
    while (i < args.length) {
      const arg = args[i];
      
      if (arg === '--') {
        remaining.push(...args.slice(i + 1));
        break;
      }
      
      if (arg.startsWith('--')) {
        const name = arg.slice(2);
        const def = optDefs[name];
        if (def) {
          if (def.type === 'boolean') {
            options[name] = true;
          } else if (i + 1 < args.length) {
            options[name] = args[++i];
          }
        }
      } else if (arg.startsWith('-') && arg.length > 1) {
        // Handle short options
        for (let j = 1; j < arg.length; j++) {
          const char = arg[j];
          // Find matching option
          for (const [name, def] of Object.entries(optDefs)) {
            if (def.short === char) {
              if (def.type === 'boolean') {
                options[name] = true;
              } else if (j === arg.length - 1 && i + 1 < args.length) {
                options[name] = args[++i];
              }
              break;
            }
          }
        }
      } else {
        remaining.push(arg);
      }
      i++;
    }
    
    return { options, args: remaining };
  }

  /**
   * Get help text
   */
  #getHelpText() {
    return `
\x1b[38;2;107;158;126mCLAWD OS1 Terminal\x1b[0m - Bash-compatible shell with AgentFS

\x1b[38;2;212;165;116mFile Operations:\x1b[0m
  ls [-la] [path]       List directory contents
  cd [path]             Change directory  
  pwd                   Print working directory
  cat [-n] <file>       Display file contents
  mkdir [-p] <dir>      Create directory
  rm [-rf] <path>       Remove file or directory
  touch <file>          Create empty file
  cp [-r] <src> <dst>   Copy files
  mv <src> <dst>        Move/rename files
  ln [-s] <tgt> <lnk>   Create links
  stat <file>           Display file status
  file <file>           Determine file type
  tree [-L n] [dir]     Display directory tree
  find [path] -name     Search for files
  du [-sh] [path]       Disk usage

\x1b[38;2;212;165;116mText Processing:\x1b[0m
  grep [-inv] <pat>     Search for patterns
  head [-n N] <file>    Output first N lines
  tail [-n N] <file>    Output last N lines
  wc [-lwc] <file>      Word/line/char count
  sort [-rnu] <file>    Sort lines
  uniq [-cd] <file>     Filter duplicate lines
  cut -f N [-d D]       Cut fields from lines
  tr <set1> <set2>      Translate characters
  base64 [-d]           Encode/decode base64
  diff <f1> <f2>        Compare files

\x1b[38;2;212;165;116mShell Features:\x1b[0m
  cmd1 | cmd2           Pipe output
  cmd > file            Redirect output
  cmd >> file           Append output
  cmd1 && cmd2          Run if success
  cmd1 || cmd2          Run if failure
  $VAR, \${VAR}          Variable expansion

\x1b[38;2;212;165;116mEnvironment:\x1b[0m
  echo [-ne] <text>     Display text
  printf <fmt> <args>   Format output
  env / printenv        Show environment
  export VAR=val        Set variable
  alias name=cmd        Create alias
  history               Command history
  date [+format]        Show date/time
  which <cmd>           Show command path

\x1b[38;2;212;165;116mUtilities:\x1b[0m
  seq [first] <last>    Print number sequence
  basename <path>       Strip directory
  dirname <path>        Strip filename
  tee [-a] <file>       Read stdin, write to files
  xargs <cmd>           Build commands from stdin
  sleep <sec>           Pause execution
  expr <expr>           Evaluate expression

\x1b[38;2;212;165;116mGit:\x1b[0m
  git init              Initialize repository
  git status            Show working tree status
  git add <file>        Stage files
  git commit -m "msg"   Commit changes
  git log               Show commit history
  git diff              Show changes
  git branch [name]     List/create branches
  git clone <url>       Clone repository

\x1b[38;2;212;165;116mTerminal:\x1b[0m
  clear / Ctrl+L        Clear screen
  help                  Show this help
  exit / Ctrl+D         Close terminal

\x1b[38;2;138;134;130mTip: Use Tab for autocompletion, ↑↓ for history\x1b[0m
`;
  }
  
  /**
   * Show help text (legacy method for direct output)
   */
  #showHelp() {
    this.#terminal?.write(this.#getHelpText().replace(/\n/g, '\r\n'));
  }

  /**
   * Write a line to terminal
   */
  #writeLine(text) {
    this.#terminal?.write(text + '\r\n');
  }

  /**
   * Write error to terminal
   */
  #writeError(text) {
    this.#terminal?.write(`\x1b[38;2;200;69;54m${text}\x1b[0m\r\n`);
  }

  /**
   * Write success to terminal
   */
  #writeSuccess(text) {
    this.#terminal?.write(`\x1b[38;2;107;158;126m${text}\x1b[0m\r\n`);
  }

  /**
   * Resolve a path relative to cwd
   */
  #resolvePath(path) {
    if (!path) return this.#cwd;
    if (path.startsWith('/')) return this.#normalizePath(path);
    
    const parts = this.#cwd.split('/').filter(Boolean);
    const newParts = path.split('/');
    
    for (const part of newParts) {
      if (part === '..') {
        parts.pop();
      } else if (part !== '.' && part) {
        parts.push(part);
      }
    }
    
    return '/' + parts.join('/') || '/';
  }

  /**
   * Normalize a path
   */
  #normalizePath(path) {
    const parts = path.split('/').filter(Boolean);
    const result = [];
    
    for (const part of parts) {
      if (part === '..') {
        result.pop();
      } else if (part !== '.') {
        result.push(part);
      }
    }
    
    return '/' + result.join('/') || '/';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Filesystem Commands
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * cd - Change directory
   */
  async #cmdCd(path) {
    const targetPath = path || this.#env.HOME || '/';
    const newPath = this.#resolvePath(targetPath);
    
    try {
      const agent = await agentfs.getAgent();
      const stats = await agent.fs.stat(newPath);
      
      if (!stats.isDirectory()) {
        return { stdout: '', stderr: `cd: not a directory: ${path}`, exitCode: 1 };
      }
      
      this.#cwd = newPath;
      this.#env.PWD = newPath;
      this.#env.OLDPWD = this.#cwd;
      this.#updatePathDisplay();
      return { stdout: '', stderr: '', exitCode: 0 };
    } catch (err) {
      if (err.code === 'ENOENT') {
        return { stdout: '', stderr: `cd: no such directory: ${path}`, exitCode: 1 };
      }
      throw err;
    }
  }

  /**
   * ls - List directory
   */
  async #cmdLs(args) {
    const { options, args: paths } = this.#parseOptions(args, {
      'all': { short: 'a', type: 'boolean', default: false },
      'long': { short: 'l', type: 'boolean', default: false },
      'human': { short: 'h', type: 'boolean', default: false },
      'recursive': { short: 'R', type: 'boolean', default: false },
      'reverse': { short: 'r', type: 'boolean', default: false },
      'size': { short: 'S', type: 'boolean', default: false },
      'time': { short: 't', type: 'boolean', default: false },
      '1': { short: '1', type: 'boolean', default: false }
    });
    
    // Handle -la combo
    if (args.includes('-la') || args.includes('-al')) {
      options.all = true;
      options.long = true;
    }
    
    const targetPaths = paths.length > 0 ? paths : [this.#cwd];
    let output = '';
    
    try {
      const agent = await agentfs.getAgent();
      
      for (const path of targetPaths) {
        const resolvedPath = this.#resolvePath(path);
        
        if (targetPaths.length > 1) {
          output += `${path}:\n`;
        }
        
        const entries = await agent.fs.readdirPlus(resolvedPath);
        
        // Filter hidden files
        let filtered = options.all 
          ? entries 
          : entries.filter(e => !e.name.startsWith('.'));
        
        // Sort
        filtered.sort((a, b) => {
          if (options.size) {
            return b.stats.size - a.stats.size;
          }
          if (options.time) {
            return b.stats.mtime - a.stats.mtime;
          }
          const aDir = a.stats.isDirectory();
          const bDir = b.stats.isDirectory();
          if (aDir && !bDir) return -1;
          if (!aDir && bDir) return 1;
          return a.name.localeCompare(b.name);
        });
        
        if (options.reverse) {
          filtered.reverse();
        }
        
        if (options.long) {
          // Long format
          for (const entry of filtered) {
            const isDir = entry.stats.isDirectory();
            const mode = isDir ? 'drwxr-xr-x' : '-rw-r--r--';
            const size = options.human 
              ? this.#formatSize(entry.stats.size)
              : String(entry.stats.size).padStart(8);
            const date = new Date(entry.stats.mtime * 1000);
            const dateStr = date.toLocaleDateString('en-US', { 
              month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' 
            }).replace(',', '');
            const name = isDir 
              ? `\x1b[38;2;107;158;126m${entry.name}/\x1b[0m`
              : entry.name;
            output += `${mode}  ${size}  ${dateStr}  ${name}\n`;
          }
        } else if (options['1']) {
          // One per line
          for (const entry of filtered) {
            const isDir = entry.stats.isDirectory();
            const name = isDir 
              ? `\x1b[38;2;107;158;126m${entry.name}/\x1b[0m`
              : entry.name;
            output += name + '\n';
          }
        } else {
          // Simple listing
          const names = filtered.map(e => {
            const isDir = e.stats.isDirectory();
            return isDir 
              ? `\x1b[38;2;107;158;126m${e.name}/\x1b[0m`
              : e.name;
          });
          output += names.join('  ') + '\n';
        }
        
        if (targetPaths.length > 1) output += '\n';
      }
      
      return { stdout: output, stderr: '', exitCode: 0 };
    } catch (err) {
      if (err.code === 'ENOENT') {
        return { stdout: '', stderr: `ls: cannot access '${targetPaths[0]}': No such file or directory`, exitCode: 2 };
      }
      throw err;
    }
  }

  /**
   * cat - Display file contents (supports multiple files and stdin)
   */
  async #cmdCat(args, stdin = '') {
    const { options, args: files } = this.#parseOptions(args, {
      'number': { short: 'n', type: 'boolean', default: false },
      'numberNonblank': { short: 'b', type: 'boolean', default: false },
      'showEnds': { short: 'E', type: 'boolean', default: false },
      'showTabs': { short: 'T', type: 'boolean', default: false }
    });
    
    let output = '';
    
    // If no files and stdin provided, use stdin
    if (files.length === 0 && stdin) {
      output = stdin;
    } else if (files.length === 0) {
      return { stdout: '', stderr: 'cat: missing operand', exitCode: 1 };
    } else {
      // Read all files
      for (const file of files) {
        if (file === '-') {
          output += stdin;
          continue;
        }
        
        const resolvedPath = this.#resolvePath(file);
        try {
          const content = await agentfs.readFile(resolvedPath, 'utf-8');
          if (content !== null) {
            output += content;
          }
        } catch (err) {
          if (err.code === 'ENOENT') {
            return { stdout: output, stderr: `cat: ${file}: No such file or directory`, exitCode: 1 };
          } else if (err.code === 'EISDIR') {
            return { stdout: output, stderr: `cat: ${file}: Is a directory`, exitCode: 1 };
          }
          throw err;
        }
      }
    }
    
    // Apply options
    if (options.number || options.numberNonblank) {
      const lines = output.split('\n');
      let lineNum = 1;
      output = lines.map((line, i) => {
        if (options.numberNonblank && line === '') {
          return line;
        }
        return `${String(lineNum++).padStart(6)}  ${line}`;
      }).join('\n');
    }
    
    if (options.showEnds) {
      output = output.replace(/$/gm, '$');
    }
    
    if (options.showTabs) {
      output = output.replace(/\t/g, '^I');
    }
    
    return { stdout: output.endsWith('\n') ? output : output + '\n', stderr: '', exitCode: 0 };
  }

  /**
   * mkdir - Create directory
   */
  async #cmdMkdir(args) {
    const { options, args: dirs } = this.#parseOptions(args, {
      'parents': { short: 'p', type: 'boolean', default: false },
      'verbose': { short: 'v', type: 'boolean', default: false }
    });
    
    if (dirs.length === 0) {
      return { stdout: '', stderr: 'mkdir: missing operand', exitCode: 1 };
    }
    
    let output = '';
    
    for (const dir of dirs) {
      const resolvedPath = this.#resolvePath(dir);
      
      try {
        const agent = await agentfs.getAgent();
        
        if (options.parents) {
          // Create parent directories as needed
          const parts = resolvedPath.split('/').filter(Boolean);
          let currentPath = '';
          for (const part of parts) {
            currentPath += '/' + part;
            try {
              await agent.fs.mkdir(currentPath);
              if (options.verbose) {
                output += `mkdir: created directory '${currentPath}'\n`;
              }
            } catch (e) {
              if (e.code !== 'EEXIST') throw e;
            }
          }
        } else {
          await agent.fs.mkdir(resolvedPath);
          if (options.verbose) {
            output += `mkdir: created directory '${dir}'\n`;
          }
        }
      } catch (err) {
        if (err.code === 'EEXIST') {
          return { stdout: output, stderr: `mkdir: cannot create directory '${dir}': File exists`, exitCode: 1 };
        }
        throw err;
      }
    }
    
    return { stdout: output, stderr: '', exitCode: 0 };
  }

  /**
   * rm - Remove file or directory
   */
  async #cmdRm(args) {
    const { options, args: paths } = this.#parseOptions(args, {
      'recursive': { short: 'r', type: 'boolean', default: false },
      'force': { short: 'f', type: 'boolean', default: false },
      'verbose': { short: 'v', type: 'boolean', default: false }
    });
    
    // Handle -rf combo
    if (args.includes('-rf') || args.includes('-fr')) {
      options.recursive = true;
      options.force = true;
    }
    
    if (paths.length === 0) {
      return { stdout: '', stderr: 'rm: missing operand', exitCode: 1 };
    }
    
    let output = '';
    
    for (const path of paths) {
      const resolvedPath = this.#resolvePath(path);
      
      try {
        const agent = await agentfs.getAgent();
        await agent.fs.rm(resolvedPath, { recursive: options.recursive, force: options.force });
        if (options.verbose) {
          output += `removed '${path}'\n`;
        }
      } catch (err) {
        if (err.code === 'ENOENT' && !options.force) {
          return { stdout: output, stderr: `rm: cannot remove '${path}': No such file or directory`, exitCode: 1 };
        } else if (err.code === 'EISDIR' && !options.recursive) {
          return { stdout: output, stderr: `rm: cannot remove '${path}': Is a directory`, exitCode: 1 };
        } else if (!options.force) {
          throw err;
        }
      }
    }
    
    return { stdout: output, stderr: '', exitCode: 0 };
  }

  /**
   * rmdir - Remove empty directory
   */
  async #cmdRmdir(args) {
    const { options, args: dirs } = this.#parseOptions(args, {
      'parents': { short: 'p', type: 'boolean', default: false },
      'verbose': { short: 'v', type: 'boolean', default: false }
    });
    
    if (dirs.length === 0) {
      return { stdout: '', stderr: 'rmdir: missing operand', exitCode: 1 };
    }
    
    let output = '';
    
    for (const dir of dirs) {
      const resolvedPath = this.#resolvePath(dir);
      
      try {
        const agent = await agentfs.getAgent();
        await agent.fs.rmdir(resolvedPath);
        if (options.verbose) {
          output += `rmdir: removing directory, '${dir}'\n`;
        }
      } catch (err) {
        if (err.code === 'ENOENT') {
          return { stdout: output, stderr: `rmdir: failed to remove '${dir}': No such file or directory`, exitCode: 1 };
        } else if (err.code === 'ENOTEMPTY') {
          return { stdout: output, stderr: `rmdir: failed to remove '${dir}': Directory not empty`, exitCode: 1 };
        }
        throw err;
      }
    }
    
    return { stdout: output, stderr: '', exitCode: 0 };
  }

  /**
   * touch - Create empty file or update timestamp
   */
  async #cmdTouch(args) {
    if (args.length === 0) {
      return { stdout: '', stderr: 'touch: missing file operand', exitCode: 1 };
    }
    
    for (const file of args) {
      if (file.startsWith('-')) continue;
      
      const resolvedPath = this.#resolvePath(file);
      
      try {
        const exists = await agentfs.exists(resolvedPath);
        if (!exists) {
          await agentfs.writeFile(resolvedPath, '');
        }
        // If exists, we'd update timestamp, but AgentFS handles this
      } catch (err) {
        return { stdout: '', stderr: `touch: cannot touch '${file}': ${err.message}`, exitCode: 1 };
      }
    }
    
    return { stdout: '', stderr: '', exitCode: 0 };
  }

  /**
   * cp - Copy files
   */
  async #cmdCp(args) {
    const { options, args: paths } = this.#parseOptions(args, {
      'recursive': { short: 'r', type: 'boolean', default: false },
      'force': { short: 'f', type: 'boolean', default: false },
      'verbose': { short: 'v', type: 'boolean', default: false }
    });
    
    if (paths.length < 2) {
      return { stdout: '', stderr: 'cp: missing destination file operand', exitCode: 1 };
    }
    
    const dest = paths[paths.length - 1];
    const sources = paths.slice(0, -1);
    const destPath = this.#resolvePath(dest);
    
    let output = '';
    
    try {
      const agent = await agentfs.getAgent();
      
      // Check if destination is a directory
      let destIsDir = false;
      try {
        const destStat = await agent.fs.stat(destPath);
        destIsDir = destStat.isDirectory();
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
      }
      
      for (const src of sources) {
        const srcPath = this.#resolvePath(src);
        const targetPath = destIsDir 
          ? destPath + '/' + src.split('/').pop()
          : destPath;
        
        await agent.fs.copyFile(srcPath, targetPath);
        
        if (options.verbose) {
          output += `'${src}' -> '${targetPath}'\n`;
        }
      }
      
      return { stdout: output, stderr: '', exitCode: 0 };
    } catch (err) {
      if (err.code === 'ENOENT') {
        return { stdout: output, stderr: `cp: cannot stat '${sources[0]}': No such file or directory`, exitCode: 1 };
      }
      throw err;
    }
  }

  /**
   * mv - Move/rename files
   */
  async #cmdMv(args) {
    const { options, args: paths } = this.#parseOptions(args, {
      'force': { short: 'f', type: 'boolean', default: false },
      'verbose': { short: 'v', type: 'boolean', default: false }
    });
    
    if (paths.length < 2) {
      return { stdout: '', stderr: 'mv: missing destination file operand', exitCode: 1 };
    }
    
    const dest = paths[paths.length - 1];
    const sources = paths.slice(0, -1);
    const destPath = this.#resolvePath(dest);
    
    let output = '';
    
    try {
      const agent = await agentfs.getAgent();
      
      // Check if destination is a directory
      let destIsDir = false;
      try {
        const destStat = await agent.fs.stat(destPath);
        destIsDir = destStat.isDirectory();
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
      }
      
      for (const src of sources) {
        const srcPath = this.#resolvePath(src);
        const targetPath = destIsDir 
          ? destPath + '/' + src.split('/').pop()
          : destPath;
        
        await agent.fs.rename(srcPath, targetPath);
        
        if (options.verbose) {
          output += `renamed '${src}' -> '${targetPath}'\n`;
        }
      }
      
      return { stdout: output, stderr: '', exitCode: 0 };
    } catch (err) {
      if (err.code === 'ENOENT') {
        return { stdout: output, stderr: `mv: cannot stat '${sources[0]}': No such file or directory`, exitCode: 1 };
      }
      throw err;
    }
  }

  /**
   * ln - Create links
   */
  async #cmdLn(args) {
    const { options, args: paths } = this.#parseOptions(args, {
      'symbolic': { short: 's', type: 'boolean', default: false },
      'force': { short: 'f', type: 'boolean', default: false }
    });
    
    if (paths.length < 2) {
      return { stdout: '', stderr: 'ln: missing file operand', exitCode: 1 };
    }
    
    const target = paths[0];
    const link = paths[1];
    const linkPath = this.#resolvePath(link);
    
    try {
      const agent = await agentfs.getAgent();
      
      if (options.force) {
        try {
          await agent.fs.unlink(linkPath);
        } catch (e) {
          if (e.code !== 'ENOENT') throw e;
        }
      }
      
      if (options.symbolic) {
        await agent.fs.symlink(target, linkPath);
      } else {
        // Hard links not fully supported, simulate with copy
        const targetPath = this.#resolvePath(target);
        await agent.fs.copyFile(targetPath, linkPath);
      }
      
      return { stdout: '', stderr: '', exitCode: 0 };
    } catch (err) {
      return { stdout: '', stderr: `ln: failed to create link '${link}': ${err.message}`, exitCode: 1 };
    }
  }

  /**
   * stat - Display file status
   */
  async #cmdStat(args) {
    if (args.length === 0) {
      return { stdout: '', stderr: 'stat: missing operand', exitCode: 1 };
    }
    
    let output = '';
    
    for (const file of args) {
      if (file.startsWith('-')) continue;
      
      const resolvedPath = this.#resolvePath(file);
      
      try {
        const agent = await agentfs.getAgent();
        const stats = await agent.fs.stat(resolvedPath);
        
        const type = stats.isDirectory() ? 'directory' : 'regular file';
        const size = stats.size;
        const atime = new Date(stats.atime * 1000).toISOString();
        const mtime = new Date(stats.mtime * 1000).toISOString();
        const ctime = new Date(stats.ctime * 1000).toISOString();
        
        output += `  File: ${file}\n`;
        output += `  Size: ${size}\t\tType: ${type}\n`;
        output += `  Inode: ${stats.ino}\n`;
        output += `Access: ${atime}\n`;
        output += `Modify: ${mtime}\n`;
        output += `Change: ${ctime}\n`;
      } catch (err) {
        if (err.code === 'ENOENT') {
          return { stdout: output, stderr: `stat: cannot stat '${file}': No such file or directory`, exitCode: 1 };
        }
        throw err;
      }
    }
    
    return { stdout: output, stderr: '', exitCode: 0 };
  }

  /**
   * file - Determine file type
   */
  async #cmdFile(args) {
    if (args.length === 0) {
      return { stdout: '', stderr: 'file: missing operand', exitCode: 1 };
    }
    
    let output = '';
    
    for (const file of args) {
      if (file.startsWith('-')) continue;
      
      const resolvedPath = this.#resolvePath(file);
      
      try {
        const agent = await agentfs.getAgent();
        const stats = await agent.fs.stat(resolvedPath);
        
        if (stats.isDirectory()) {
          output += `${file}: directory\n`;
        } else {
          // Try to determine file type from content
          const content = await agentfs.readFile(resolvedPath, 'utf-8');
          let type = 'data';
          
          if (content === null || content === '') {
            type = 'empty';
          } else if (content.startsWith('{') || content.startsWith('[')) {
            type = 'JSON data';
          } else if (content.startsWith('<!DOCTYPE') || content.startsWith('<html')) {
            type = 'HTML document';
          } else if (content.startsWith('<?xml')) {
            type = 'XML document';
          } else if (content.startsWith('#!')) {
            type = 'script text executable';
          } else if (/^[\x00-\x7F]*$/.test(content)) {
            type = 'ASCII text';
          } else {
            type = 'UTF-8 Unicode text';
          }
          
          output += `${file}: ${type}\n`;
        }
      } catch (err) {
        if (err.code === 'ENOENT') {
          output += `${file}: cannot open (No such file or directory)\n`;
        } else {
          throw err;
        }
      }
    }
    
    return { stdout: output, stderr: '', exitCode: 0 };
  }

  /**
   * tree - Display directory tree
   */
  async #cmdTree(args) {
    const { options, args: dirs } = this.#parseOptions(args, {
      'all': { short: 'a', type: 'boolean', default: false },
      'dironly': { short: 'd', type: 'boolean', default: false },
      'level': { short: 'L', type: 'string', default: null }
    });
    
    const targetDir = dirs[0] || this.#cwd;
    const maxLevel = options.level ? parseInt(options.level) : Infinity;
    
    let output = targetDir + '\n';
    let dirCount = 0;
    let fileCount = 0;
    
    const printTree = async (path, prefix, level) => {
      if (level >= maxLevel) return;
      
      try {
        const agent = await agentfs.getAgent();
        let entries = await agent.fs.readdirPlus(path);
        
        if (!options.all) {
          entries = entries.filter(e => !e.name.startsWith('.'));
        }
        
        entries.sort((a, b) => a.name.localeCompare(b.name));
        
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          const isLast = i === entries.length - 1;
          const connector = isLast ? '└── ' : '├── ';
          const isDir = entry.stats.isDirectory();
          
          if (options.dironly && !isDir) continue;
          
          if (isDir) {
            dirCount++;
            output += `${prefix}${connector}\x1b[38;2;107;158;126m${entry.name}/\x1b[0m\n`;
            const newPrefix = prefix + (isLast ? '    ' : '│   ');
            await printTree(path + '/' + entry.name, newPrefix, level + 1);
          } else {
            fileCount++;
            output += `${prefix}${connector}${entry.name}\n`;
          }
        }
      } catch (err) {
        // Ignore permission errors
      }
    };
    
    await printTree(this.#resolvePath(targetDir), '', 0);
    output += `\n${dirCount} directories, ${fileCount} files\n`;
    
    return { stdout: output, stderr: '', exitCode: 0 };
  }

  /**
   * find - Search for files
   */
  async #cmdFind(args) {
    const { options, args: paths } = this.#parseOptions(args, {
      'name': { short: 'name', type: 'string', default: null },
      'type': { short: 'type', type: 'string', default: null },
      'maxdepth': { short: 'maxdepth', type: 'string', default: null }
    });
    
    // Parse find-style arguments
    let searchPath = this.#cwd;
    let namePattern = null;
    let typeFilter = null;
    let maxDepth = Infinity;
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '-name' && args[i + 1]) {
        namePattern = args[++i];
      } else if (arg === '-type' && args[i + 1]) {
        typeFilter = args[++i];
      } else if (arg === '-maxdepth' && args[i + 1]) {
        maxDepth = parseInt(args[++i]);
      } else if (!arg.startsWith('-')) {
        searchPath = arg;
      }
    }
    
    let output = '';
    
    const search = async (path, depth) => {
      if (depth > maxDepth) return;
      
      try {
        const agent = await agentfs.getAgent();
        const entries = await agent.fs.readdirPlus(path);
        
        for (const entry of entries) {
          const fullPath = path + '/' + entry.name;
          const isDir = entry.stats.isDirectory();
          
          // Type filter
          if (typeFilter) {
            if (typeFilter === 'd' && !isDir) continue;
            if (typeFilter === 'f' && isDir) continue;
          }
          
          // Name pattern (simple glob)
          if (namePattern) {
            const regex = new RegExp('^' + namePattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
            if (!regex.test(entry.name)) {
              if (isDir) await search(fullPath, depth + 1);
              continue;
            }
          }
          
          output += fullPath + '\n';
          
          if (isDir) {
            await search(fullPath, depth + 1);
          }
        }
      } catch (err) {
        // Ignore errors (permission, etc.)
      }
    };
    
    const resolvedPath = this.#resolvePath(searchPath);
    output += resolvedPath + '\n';
    await search(resolvedPath, 0);
    
    return { stdout: output, stderr: '', exitCode: 0 };
  }

  /**
   * du - Estimate file space usage
   */
  async #cmdDu(args) {
    const { options, args: paths } = this.#parseOptions(args, {
      'human': { short: 'h', type: 'boolean', default: false },
      'summarize': { short: 's', type: 'boolean', default: false },
      'all': { short: 'a', type: 'boolean', default: false }
    });
    
    const targetPath = paths[0] || this.#cwd;
    let output = '';
    let totalSize = 0;
    
    const calculateSize = async (path, depth = 0) => {
      try {
        const agent = await agentfs.getAgent();
        const stats = await agent.fs.stat(path);
        
        if (stats.isDirectory()) {
          const entries = await agent.fs.readdirPlus(path);
          let dirSize = 0;
          
          for (const entry of entries) {
            const entrySize = await calculateSize(path + '/' + entry.name, depth + 1);
            dirSize += entrySize;
          }
          
          if (!options.summarize || depth === 0) {
            const sizeStr = options.human ? this.#formatSize(dirSize) : String(dirSize);
            output += `${sizeStr}\t${path}\n`;
          }
          
          return dirSize;
        } else {
          if (options.all && !options.summarize) {
            const sizeStr = options.human ? this.#formatSize(stats.size) : String(stats.size);
            output += `${sizeStr}\t${path}\n`;
          }
          return stats.size;
        }
      } catch (err) {
        return 0;
      }
    };
    
    totalSize = await calculateSize(this.#resolvePath(targetPath));
    
    if (options.summarize) {
      const sizeStr = options.human ? this.#formatSize(totalSize) : String(totalSize);
      output = `${sizeStr}\t${targetPath}\n`;
    }
    
    return { stdout: output, stderr: '', exitCode: 0 };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Text Processing Commands
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * echo - Display text
   */
  #cmdEcho(args) {
    let output = '';
    let noNewline = false;
    let interpretEscapes = false;
    
    let i = 0;
    while (i < args.length && args[i].startsWith('-')) {
      if (args[i] === '-n') noNewline = true;
      else if (args[i] === '-e') interpretEscapes = true;
      else if (args[i] === '-E') interpretEscapes = false;
      else break;
      i++;
    }
    
    output = args.slice(i).join(' ');
    
    if (interpretEscapes) {
      output = output
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\\\/g, '\\');
    }
    
    if (!noNewline) output += '\n';
    
    return { stdout: output, stderr: '', exitCode: 0 };
  }

  /**
   * printf - Format and print data
   */
  #cmdPrintf(args) {
    if (args.length === 0) {
      return { stdout: '', stderr: 'printf: usage: printf format [arguments]', exitCode: 1 };
    }
    
    let format = args[0];
    const values = args.slice(1);
    let valueIndex = 0;
    
    // Simple printf implementation
    let output = format.replace(/%([sd%])/g, (match, specifier) => {
      if (specifier === '%') return '%';
      if (valueIndex >= values.length) return '';
      const val = values[valueIndex++];
      if (specifier === 'd') return String(parseInt(val) || 0);
      return val;
    });
    
    // Handle escape sequences
    output = output
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\\\/g, '\\');
    
    return { stdout: output, stderr: '', exitCode: 0 };
  }

  /**
   * grep - Search for patterns
   */
  async #cmdGrep(args, stdin, variant = 'grep') {
    const { options, args: remaining } = this.#parseOptions(args, {
      'ignoreCase': { short: 'i', type: 'boolean', default: false },
      'invertMatch': { short: 'v', type: 'boolean', default: false },
      'count': { short: 'c', type: 'boolean', default: false },
      'lineNumber': { short: 'n', type: 'boolean', default: false },
      'onlyMatching': { short: 'o', type: 'boolean', default: false },
      'filesWithMatches': { short: 'l', type: 'boolean', default: false },
      'recursive': { short: 'r', type: 'boolean', default: false },
      'extended': { short: 'E', type: 'boolean', default: variant === 'egrep' },
      'fixed': { short: 'F', type: 'boolean', default: variant === 'fgrep' },
      'context': { short: 'C', type: 'string', default: null },
      'after': { short: 'A', type: 'string', default: null },
      'before': { short: 'B', type: 'string', default: null }
    });
    
    if (remaining.length === 0) {
      return { stdout: '', stderr: 'grep: missing pattern', exitCode: 2 };
    }
    
    const pattern = remaining[0];
    const files = remaining.slice(1);
    
    // Build regex
    let regexPattern = options.fixed 
      ? pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      : pattern;
    
    const flags = options.ignoreCase ? 'gi' : 'g';
    let regex;
    try {
      regex = new RegExp(regexPattern, flags);
    } catch (e) {
      return { stdout: '', stderr: `grep: invalid pattern: ${pattern}`, exitCode: 2 };
    }
    
    let output = '';
    let matchCount = 0;
    let exitCode = 1; // No match
    
    const searchContent = (content, filename = null) => {
      const lines = content.split('\n');
      let localOutput = '';
      let localCount = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const matches = regex.test(line);
        regex.lastIndex = 0; // Reset for global flag
        
        const shouldInclude = options.invertMatch ? !matches : matches;
        
        if (shouldInclude) {
          localCount++;
          
          if (!options.count && !options.filesWithMatches) {
            let outputLine = line;
            
            if (options.onlyMatching && !options.invertMatch) {
              const allMatches = line.match(new RegExp(regexPattern, flags)) || [];
              outputLine = allMatches.join('\n');
            }
            
            const prefix = [];
            if (filename && files.length > 1) prefix.push(filename);
            if (options.lineNumber) prefix.push(String(i + 1));
            
            const prefixStr = prefix.length > 0 ? prefix.join(':') + ':' : '';
            localOutput += prefixStr + outputLine + '\n';
          }
        }
      }
      
      if (localCount > 0) {
        exitCode = 0;
        matchCount += localCount;
        
        if (options.filesWithMatches && filename) {
          output += filename + '\n';
        } else if (options.count) {
          const prefix = filename && files.length > 1 ? filename + ':' : '';
          output += prefix + localCount + '\n';
        } else {
          output += localOutput;
        }
      }
    };
    
    // Search stdin or files
    if (files.length === 0) {
      if (stdin) {
        searchContent(stdin);
      } else {
        return { stdout: '', stderr: 'grep: missing file operand', exitCode: 2 };
      }
    } else {
      for (const file of files) {
        try {
          const resolvedPath = this.#resolvePath(file);
          const content = await agentfs.readFile(resolvedPath, 'utf-8');
          if (content) {
            searchContent(content, file);
          }
        } catch (err) {
          if (err.code !== 'ENOENT') throw err;
          return { stdout: output, stderr: `grep: ${file}: No such file or directory`, exitCode: 2 };
        }
      }
    }
    
    return { stdout: output, stderr: '', exitCode };
  }

  /**
   * head - Output first part of files
   */
  async #cmdHead(args, stdin) {
    const { options, args: files } = this.#parseOptions(args, {
      'lines': { short: 'n', type: 'string', default: '10' },
      'bytes': { short: 'c', type: 'string', default: null },
      'quiet': { short: 'q', type: 'boolean', default: false }
    });
    
    const numLines = parseInt(options.lines) || 10;
    let output = '';
    
    const processContent = (content, filename = null) => {
      if (filename && files.length > 1 && !options.quiet) {
        output += `==> ${filename} <==\n`;
      }
      
      if (options.bytes) {
        const bytes = parseInt(options.bytes);
        output += content.substring(0, bytes);
      } else {
        const lines = content.split('\n');
        output += lines.slice(0, numLines).join('\n');
        if (lines.length > numLines) output += '\n';
      }
    };
    
    if (files.length === 0) {
      if (stdin) {
        processContent(stdin);
      }
    } else {
      for (const file of files) {
        try {
          const resolvedPath = this.#resolvePath(file);
          const content = await agentfs.readFile(resolvedPath, 'utf-8');
          if (content !== null) {
            processContent(content, file);
          }
        } catch (err) {
          return { stdout: output, stderr: `head: cannot open '${file}': ${err.message}`, exitCode: 1 };
        }
      }
    }
    
    return { stdout: output.endsWith('\n') ? output : output + '\n', stderr: '', exitCode: 0 };
  }

  /**
   * tail - Output last part of files
   */
  async #cmdTail(args, stdin) {
    const { options, args: files } = this.#parseOptions(args, {
      'lines': { short: 'n', type: 'string', default: '10' },
      'bytes': { short: 'c', type: 'string', default: null },
      'quiet': { short: 'q', type: 'boolean', default: false }
    });
    
    const numLines = parseInt(options.lines) || 10;
    let output = '';
    
    const processContent = (content, filename = null) => {
      if (filename && files.length > 1 && !options.quiet) {
        output += `==> ${filename} <==\n`;
      }
      
      if (options.bytes) {
        const bytes = parseInt(options.bytes);
        output += content.substring(content.length - bytes);
      } else {
        const lines = content.split('\n');
        const start = Math.max(0, lines.length - numLines - 1);
        output += lines.slice(start).join('\n');
      }
    };
    
    if (files.length === 0) {
      if (stdin) {
        processContent(stdin);
      }
    } else {
      for (const file of files) {
        try {
          const resolvedPath = this.#resolvePath(file);
          const content = await agentfs.readFile(resolvedPath, 'utf-8');
          if (content !== null) {
            processContent(content, file);
          }
        } catch (err) {
          return { stdout: output, stderr: `tail: cannot open '${file}': ${err.message}`, exitCode: 1 };
        }
      }
    }
    
    return { stdout: output.endsWith('\n') ? output : output + '\n', stderr: '', exitCode: 0 };
  }

  /**
   * wc - Word, line, character count
   */
  async #cmdWc(args, stdin) {
    const { options, args: files } = this.#parseOptions(args, {
      'lines': { short: 'l', type: 'boolean', default: false },
      'words': { short: 'w', type: 'boolean', default: false },
      'chars': { short: 'c', type: 'boolean', default: false },
      'bytes': { short: 'm', type: 'boolean', default: false }
    });
    
    // If no specific option, show all
    const showAll = !options.lines && !options.words && !options.chars && !options.bytes;
    
    let output = '';
    let totalLines = 0, totalWords = 0, totalChars = 0;
    
    const countContent = (content, filename = null) => {
      const lines = content.split('\n').length - (content.endsWith('\n') ? 1 : 0);
      const words = content.trim().split(/\s+/).filter(w => w).length;
      const chars = content.length;
      
      totalLines += lines;
      totalWords += words;
      totalChars += chars;
      
      const parts = [];
      if (showAll || options.lines) parts.push(String(lines).padStart(8));
      if (showAll || options.words) parts.push(String(words).padStart(8));
      if (showAll || options.chars || options.bytes) parts.push(String(chars).padStart(8));
      
      output += parts.join(' ') + (filename ? ` ${filename}` : '') + '\n';
    };
    
    if (files.length === 0) {
      if (stdin) {
        countContent(stdin);
      }
    } else {
      for (const file of files) {
        try {
          const resolvedPath = this.#resolvePath(file);
          const content = await agentfs.readFile(resolvedPath, 'utf-8');
          if (content !== null) {
            countContent(content, file);
          }
        } catch (err) {
          return { stdout: output, stderr: `wc: ${file}: No such file or directory`, exitCode: 1 };
        }
      }
      
      // Total if multiple files
      if (files.length > 1) {
        const parts = [];
        if (showAll || options.lines) parts.push(String(totalLines).padStart(8));
        if (showAll || options.words) parts.push(String(totalWords).padStart(8));
        if (showAll || options.chars || options.bytes) parts.push(String(totalChars).padStart(8));
        output += parts.join(' ') + ' total\n';
      }
    }
    
    return { stdout: output, stderr: '', exitCode: 0 };
  }

  /**
   * sort - Sort lines
   */
  async #cmdSort(args, stdin) {
    const { options, args: files } = this.#parseOptions(args, {
      'reverse': { short: 'r', type: 'boolean', default: false },
      'numeric': { short: 'n', type: 'boolean', default: false },
      'unique': { short: 'u', type: 'boolean', default: false },
      'ignoreCase': { short: 'f', type: 'boolean', default: false },
      'key': { short: 'k', type: 'string', default: null }
    });
    
    let content = stdin;
    
    // Read from file if specified
    if (files.length > 0 && !stdin) {
      try {
        const resolvedPath = this.#resolvePath(files[0]);
        content = await agentfs.readFile(resolvedPath, 'utf-8') || '';
      } catch (err) {
        return { stdout: '', stderr: `sort: cannot read '${files[0]}': ${err.message}`, exitCode: 1 };
      }
    }
    
    if (!content) {
      return { stdout: '', stderr: '', exitCode: 0 };
    }
    
    let lines = content.split('\n').filter(l => l !== '');
    
    // Sort function
    lines.sort((a, b) => {
      let valA = a, valB = b;
      
      // Handle -k (key/field)
      if (options.key) {
        const keyNum = parseInt(options.key) - 1;
        const fieldsA = a.split(/\s+/);
        const fieldsB = b.split(/\s+/);
        valA = fieldsA[keyNum] || '';
        valB = fieldsB[keyNum] || '';
      }
      
      if (options.ignoreCase) {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }
      
      if (options.numeric) {
        const numA = parseFloat(valA) || 0;
        const numB = parseFloat(valB) || 0;
        return numA - numB;
      }
      
      return valA.localeCompare(valB);
    });
    
    if (options.reverse) {
      lines.reverse();
    }
    
    if (options.unique) {
      lines = [...new Set(lines)];
    }
    
    return { stdout: lines.join('\n') + '\n', stderr: '', exitCode: 0 };
  }

  /**
   * uniq - Report or filter out repeated lines
   */
  #cmdUniq(args, stdin) {
    const { options, args: remaining } = this.#parseOptions(args, {
      'count': { short: 'c', type: 'boolean', default: false },
      'repeated': { short: 'd', type: 'boolean', default: false },
      'unique': { short: 'u', type: 'boolean', default: false },
      'ignoreCase': { short: 'i', type: 'boolean', default: false }
    });
    
    if (!stdin) {
      return { stdout: '', stderr: '', exitCode: 0 };
    }
    
    const lines = stdin.split('\n');
    const result = [];
    let prevLine = null;
    let count = 0;
    
    const compareLine = (a, b) => {
      if (a === null || b === null) return false;
      return options.ignoreCase 
        ? a.toLowerCase() === b.toLowerCase()
        : a === b;
    };
    
    const outputLine = (line, cnt) => {
      if (options.repeated && cnt <= 1) return;
      if (options.unique && cnt > 1) return;
      
      if (options.count) {
        result.push(`${String(cnt).padStart(7)} ${line}`);
      } else {
        result.push(line);
      }
    };
    
    for (const line of lines) {
      if (compareLine(line, prevLine)) {
        count++;
      } else {
        if (prevLine !== null) {
          outputLine(prevLine, count);
        }
        prevLine = line;
        count = 1;
      }
    }
    
    if (prevLine !== null && prevLine !== '') {
      outputLine(prevLine, count);
    }
    
    return { stdout: result.join('\n') + (result.length > 0 ? '\n' : ''), stderr: '', exitCode: 0 };
  }

  /**
   * cut - Remove sections from lines
   */
  #cmdCut(args, stdin) {
    const { options, args: files } = this.#parseOptions(args, {
      'delimiter': { short: 'd', type: 'string', default: '\t' },
      'fields': { short: 'f', type: 'string', default: null },
      'characters': { short: 'c', type: 'string', default: null },
      'bytes': { short: 'b', type: 'string', default: null }
    });
    
    if (!options.fields && !options.characters && !options.bytes) {
      return { stdout: '', stderr: 'cut: you must specify a list of bytes, characters, or fields', exitCode: 1 };
    }
    
    const content = stdin || '';
    const lines = content.split('\n');
    const result = [];
    
    // Parse field/char specification (e.g., "1,3", "1-3", "2-")
    const parseSpec = (spec) => {
      const parts = spec.split(',');
      const indices = new Set();
      
      for (const part of parts) {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(n => parseInt(n) || null);
          const s = (start || 1) - 1;
          const e = end ? end - 1 : 999;
          for (let i = s; i <= e; i++) indices.add(i);
        } else {
          indices.add(parseInt(part) - 1);
        }
      }
      
      return indices;
    };
    
    for (const line of lines) {
      if (line === '') continue;
      
      if (options.fields) {
        const indices = parseSpec(options.fields);
        const fields = line.split(options.delimiter);
        const selected = [...indices].sort((a, b) => a - b)
          .filter(i => i < fields.length)
          .map(i => fields[i]);
        result.push(selected.join(options.delimiter));
      } else if (options.characters || options.bytes) {
        const spec = options.characters || options.bytes;
        const indices = parseSpec(spec);
        const chars = [...indices].sort((a, b) => a - b)
          .filter(i => i < line.length)
          .map(i => line[i]);
        result.push(chars.join(''));
      }
    }
    
    return { stdout: result.join('\n') + '\n', stderr: '', exitCode: 0 };
  }

  /**
   * tr - Translate characters
   */
  #cmdTr(args, stdin) {
    const { options, args: sets } = this.#parseOptions(args, {
      'delete': { short: 'd', type: 'boolean', default: false },
      'squeeze': { short: 's', type: 'boolean', default: false },
      'complement': { short: 'c', type: 'boolean', default: false }
    });
    
    if (sets.length === 0) {
      return { stdout: '', stderr: 'tr: missing operand', exitCode: 1 };
    }
    
    let content = stdin || '';
    const set1 = sets[0];
    const set2 = sets[1] || '';
    
    // Expand character classes
    const expandSet = (s) => {
      return s
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\[:lower:\]/g, 'abcdefghijklmnopqrstuvwxyz')
        .replace(/\[:upper:\]/g, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')
        .replace(/\[:digit:\]/g, '0123456789')
        .replace(/\[:alpha:\]/g, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')
        .replace(/\[:alnum:\]/g, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
        .replace(/\[:space:\]/g, ' \t\n\r\f\v');
    };
    
    const expanded1 = expandSet(set1);
    const expanded2 = expandSet(set2);
    
    if (options.delete) {
      // Delete characters in set1
      const deleteChars = new Set(expanded1);
      content = [...content].filter(c => 
        options.complement ? deleteChars.has(c) : !deleteChars.has(c)
      ).join('');
    } else {
      // Translate
      const map = new Map();
      for (let i = 0; i < expanded1.length; i++) {
        const replacement = i < expanded2.length ? expanded2[i] : expanded2[expanded2.length - 1] || '';
        map.set(expanded1[i], replacement);
      }
      
      content = [...content].map(c => map.has(c) ? map.get(c) : c).join('');
    }
    
    if (options.squeeze) {
      const squeezeChars = expanded2 || expanded1;
      for (const c of squeezeChars) {
        const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        content = content.replace(new RegExp(escaped + '+', 'g'), c);
      }
    }
    
    return { stdout: content, stderr: '', exitCode: 0 };
  }

  /**
   * rev - Reverse lines
   */
  #cmdRev(stdin) {
    if (!stdin) return { stdout: '', stderr: '', exitCode: 0 };
    
    const lines = stdin.split('\n');
    const reversed = lines.map(line => [...line].reverse().join(''));
    return { stdout: reversed.join('\n'), stderr: '', exitCode: 0 };
  }

  /**
   * tac - Concatenate and print files in reverse
   */
  #cmdTac(stdin) {
    if (!stdin) return { stdout: '', stderr: '', exitCode: 0 };
    
    const lines = stdin.split('\n').filter(l => l !== '');
    return { stdout: lines.reverse().join('\n') + '\n', stderr: '', exitCode: 0 };
  }

  /**
   * base64 - Encode/decode base64
   */
  #cmdBase64(args, stdin) {
    const { options } = this.#parseOptions(args, {
      'decode': { short: 'd', type: 'boolean', default: false }
    });
    
    if (!stdin) {
      return { stdout: '', stderr: '', exitCode: 0 };
    }
    
    try {
      if (options.decode) {
        const decoded = atob(stdin.trim());
        return { stdout: decoded + '\n', stderr: '', exitCode: 0 };
      } else {
        const encoded = btoa(stdin.replace(/\n$/, ''));
        return { stdout: encoded + '\n', stderr: '', exitCode: 0 };
      }
    } catch (e) {
      return { stdout: '', stderr: 'base64: invalid input', exitCode: 1 };
    }
  }

  /**
   * md5sum, sha1sum, sha256sum - Compute checksums
   */
  async #cmdChecksum(args, stdin, variant) {
    const content = stdin || '';
    
    // Simple hash implementation (for demo purposes)
    const simpleHash = (str, seed = 0) => {
      let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
      for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
      h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
      h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      
      return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
    };
    
    let hash;
    switch (variant) {
      case 'md5sum':
        hash = simpleHash(content, 0) + simpleHash(content, 1);
        break;
      case 'sha1sum':
        hash = simpleHash(content, 0) + simpleHash(content, 1) + simpleHash(content, 2).slice(0, 8);
        break;
      case 'sha256sum':
        hash = simpleHash(content, 0) + simpleHash(content, 1) + 
               simpleHash(content, 2) + simpleHash(content, 3);
        break;
    }
    
    return { stdout: hash + '  -\n', stderr: '', exitCode: 0 };
  }

  /**
   * diff - Compare files line by line
   */
  async #cmdDiff(args) {
    const { options, args: files } = this.#parseOptions(args, {
      'unified': { short: 'u', type: 'boolean', default: false },
      'context': { short: 'c', type: 'boolean', default: false },
      'brief': { short: 'q', type: 'boolean', default: false }
    });
    
    if (files.length < 2) {
      return { stdout: '', stderr: 'diff: missing operand', exitCode: 2 };
    }
    
    try {
      const content1 = await agentfs.readFile(this.#resolvePath(files[0]), 'utf-8') || '';
      const content2 = await agentfs.readFile(this.#resolvePath(files[1]), 'utf-8') || '';
      
      if (content1 === content2) {
        return { stdout: '', stderr: '', exitCode: 0 };
      }
      
      if (options.brief) {
        return { stdout: `Files ${files[0]} and ${files[1]} differ\n`, stderr: '', exitCode: 1 };
      }
      
      // Simple line-by-line diff
      const lines1 = content1.split('\n');
      const lines2 = content2.split('\n');
      let output = '';
      
      if (options.unified) {
        output += `--- ${files[0]}\n`;
        output += `+++ ${files[1]}\n`;
      }
      
      const maxLen = Math.max(lines1.length, lines2.length);
      for (let i = 0; i < maxLen; i++) {
        if (lines1[i] !== lines2[i]) {
          if (options.unified) {
            if (i < lines1.length) output += `-${lines1[i]}\n`;
            if (i < lines2.length) output += `+${lines2[i]}\n`;
          } else {
            output += `${i + 1}c${i + 1}\n`;
            if (i < lines1.length) output += `< ${lines1[i]}\n`;
            output += `---\n`;
            if (i < lines2.length) output += `> ${lines2[i]}\n`;
          }
        }
      }
      
      return { stdout: output, stderr: '', exitCode: output ? 1 : 0 };
    } catch (err) {
      return { stdout: '', stderr: `diff: ${err.message}`, exitCode: 2 };
    }
  }

  /**
   * nl - Number lines
   */
  #cmdNl(args, stdin) {
    const { options } = this.#parseOptions(args, {
      'startingLine': { short: 'v', type: 'string', default: '1' },
      'increment': { short: 'i', type: 'string', default: '1' },
      'width': { short: 'w', type: 'string', default: '6' }
    });
    
    if (!stdin) return { stdout: '', stderr: '', exitCode: 0 };
    
    const lines = stdin.split('\n');
    let lineNum = parseInt(options.startingLine) || 1;
    const increment = parseInt(options.increment) || 1;
    const width = parseInt(options.width) || 6;
    
    const result = lines.map(line => {
      if (line.trim() === '') {
        return '';
      }
      const num = String(lineNum).padStart(width);
      lineNum += increment;
      return `${num}\t${line}`;
    });
    
    return { stdout: result.join('\n'), stderr: '', exitCode: 0 };
  }

  /**
   * fold - Wrap lines to specified width
   */
  #cmdFold(args, stdin) {
    const { options } = this.#parseOptions(args, {
      'width': { short: 'w', type: 'string', default: '80' },
      'spaces': { short: 's', type: 'boolean', default: false }
    });
    
    if (!stdin) return { stdout: '', stderr: '', exitCode: 0 };
    
    const width = parseInt(options.width) || 80;
    const lines = stdin.split('\n');
    const result = [];
    
    for (const line of lines) {
      if (line.length <= width) {
        result.push(line);
      } else {
        let remaining = line;
        while (remaining.length > width) {
          let breakPoint = width;
          if (options.spaces) {
            const lastSpace = remaining.lastIndexOf(' ', width);
            if (lastSpace > 0) breakPoint = lastSpace;
          }
          result.push(remaining.substring(0, breakPoint));
          remaining = remaining.substring(breakPoint).trimStart();
        }
        if (remaining) result.push(remaining);
      }
    }
    
    return { stdout: result.join('\n'), stderr: '', exitCode: 0 };
  }

  /**
   * expand - Convert tabs to spaces
   */
  #cmdExpand(args, stdin) {
    const { options } = this.#parseOptions(args, {
      'tabs': { short: 't', type: 'string', default: '8' }
    });
    
    if (!stdin) return { stdout: '', stderr: '', exitCode: 0 };
    
    const tabSize = parseInt(options.tabs) || 8;
    const output = stdin.replace(/\t/g, ' '.repeat(tabSize));
    
    return { stdout: output, stderr: '', exitCode: 0 };
  }

  /**
   * unexpand - Convert spaces to tabs
   */
  #cmdUnexpand(args, stdin) {
    const { options } = this.#parseOptions(args, {
      'tabs': { short: 't', type: 'string', default: '8' }
    });
    
    if (!stdin) return { stdout: '', stderr: '', exitCode: 0 };
    
    const tabSize = parseInt(options.tabs) || 8;
    const spaces = ' '.repeat(tabSize);
    const output = stdin.replace(new RegExp(spaces, 'g'), '\t');
    
    return { stdout: output, stderr: '', exitCode: 0 };
  }

  /**
   * strings - Print printable strings
   */
  async #cmdStrings(args, stdin) {
    const { options, args: files } = this.#parseOptions(args, {
      'minLen': { short: 'n', type: 'string', default: '4' }
    });
    
    const minLen = parseInt(options.minLen) || 4;
    let content = stdin;
    
    if (!content && files.length > 0) {
      try {
        content = await agentfs.readFile(this.#resolvePath(files[0]), 'utf-8') || '';
      } catch (e) {
        return { stdout: '', stderr: `strings: ${files[0]}: ${e.message}`, exitCode: 1 };
      }
    }
    
    if (!content) return { stdout: '', stderr: '', exitCode: 0 };
    
    const regex = new RegExp(`[\\x20-\\x7E]{${minLen},}`, 'g');
    const matches = content.match(regex) || [];
    
    return { stdout: matches.join('\n') + (matches.length > 0 ? '\n' : ''), stderr: '', exitCode: 0 };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Environment & Utility Commands
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * env / printenv - Print environment variables
   */
  #cmdEnv(args) {
    if (args.length > 0 && !args[0].startsWith('-')) {
      // printenv VAR
      const val = this.#env[args[0]];
      if (val !== undefined) {
        return { stdout: val + '\n', stderr: '', exitCode: 0 };
      }
      return { stdout: '', stderr: '', exitCode: 1 };
    }
    
    let output = '';
    for (const [key, value] of Object.entries(this.#env)) {
      output += `${key}=${value}\n`;
    }
    return { stdout: output, stderr: '', exitCode: 0 };
  }

  /**
   * export - Set environment variable
   */
  #cmdExport(args) {
    if (args.length === 0) {
      // Show exported vars
      let output = '';
      for (const [key, value] of Object.entries(this.#env)) {
        output += `declare -x ${key}="${value}"\n`;
      }
      return { stdout: output, stderr: '', exitCode: 0 };
    }
    
    for (const arg of args) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex > 0) {
        const key = arg.substring(0, eqIndex);
        const value = arg.substring(eqIndex + 1);
        this.#env[key] = value;
      }
    }
    
    return { stdout: '', stderr: '', exitCode: 0 };
  }

  /**
   * unset - Unset environment variable
   */
  #cmdUnset(args) {
    for (const name of args) {
      delete this.#env[name];
    }
    return { stdout: '', stderr: '', exitCode: 0 };
  }

  /**
   * alias - Define aliases
   */
  #cmdAlias(args) {
    if (args.length === 0) {
      let output = '';
      for (const [name, value] of Object.entries(this.#aliases)) {
        output += `alias ${name}='${value}'\n`;
      }
      return { stdout: output, stderr: '', exitCode: 0 };
    }
    
    for (const arg of args) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex > 0) {
        const name = arg.substring(0, eqIndex);
        const value = arg.substring(eqIndex + 1).replace(/^['"]|['"]$/g, '');
        this.#aliases[name] = value;
      }
    }
    
    return { stdout: '', stderr: '', exitCode: 0 };
  }

  /**
   * unalias - Remove aliases
   */
  #cmdUnalias(args) {
    for (const name of args) {
      delete this.#aliases[name];
    }
    return { stdout: '', stderr: '', exitCode: 0 };
  }

  /**
   * which - Show command location
   */
  #cmdWhich(args) {
    const builtins = [
      'cd', 'pwd', 'echo', 'printf', 'export', 'alias', 'unalias', 'history',
      'ls', 'cat', 'mkdir', 'rm', 'rmdir', 'touch', 'cp', 'mv', 'ln',
      'grep', 'head', 'tail', 'wc', 'sort', 'uniq', 'cut', 'tr',
      'stat', 'file', 'tree', 'find', 'du', 'diff', 'base64',
      'date', 'seq', 'basename', 'dirname', 'tee', 'xargs',
      'git', 'help', 'clear', 'exit', 'env', 'printenv', 'whoami', 'hostname'
    ];
    
    let output = '';
    for (const cmd of args) {
      if (builtins.includes(cmd)) {
        output += `/bin/${cmd}\n`;
      } else if (this.#aliases[cmd]) {
        output += `${cmd}: aliased to ${this.#aliases[cmd]}\n`;
      } else {
        return { stdout: output, stderr: `${cmd} not found`, exitCode: 1 };
      }
    }
    
    return { stdout: output, stderr: '', exitCode: 0 };
  }

  /**
   * type - Display command type
   */
  #cmdType(args) {
    let output = '';
    
    for (const cmd of args) {
      if (this.#aliases[cmd]) {
        output += `${cmd} is aliased to '${this.#aliases[cmd]}'\n`;
      } else {
        output += `${cmd} is a shell builtin\n`;
      }
    }
    
    return { stdout: output, stderr: '', exitCode: 0 };
  }

  /**
   * date - Display date and time
   */
  #cmdDate(args) {
    const { options, args: remaining } = this.#parseOptions(args, {
      'utc': { short: 'u', type: 'boolean', default: false },
      'iso': { short: 'I', type: 'boolean', default: false }
    });
    
    const now = new Date();
    let output;
    
    if (options.iso) {
      output = now.toISOString();
    } else if (options.utc) {
      output = now.toUTCString();
    } else if (remaining.length > 0 && remaining[0].startsWith('+')) {
      // Custom format
      const format = remaining[0].substring(1);
      output = format
        .replace(/%Y/g, now.getFullYear())
        .replace(/%m/g, String(now.getMonth() + 1).padStart(2, '0'))
        .replace(/%d/g, String(now.getDate()).padStart(2, '0'))
        .replace(/%H/g, String(now.getHours()).padStart(2, '0'))
        .replace(/%M/g, String(now.getMinutes()).padStart(2, '0'))
        .replace(/%S/g, String(now.getSeconds()).padStart(2, '0'))
        .replace(/%A/g, now.toLocaleDateString('en-US', { weekday: 'long' }))
        .replace(/%B/g, now.toLocaleDateString('en-US', { month: 'long' }))
        .replace(/%Z/g, Intl.DateTimeFormat().resolvedOptions().timeZone);
    } else {
      output = now.toString();
    }
    
    return { stdout: output + '\n', stderr: '', exitCode: 0 };
  }

  /**
   * history - Command history
   */
  #cmdHistory(args) {
    const { options, args: remaining } = this.#parseOptions(args, {
      'clear': { short: 'c', type: 'boolean', default: false }
    });
    
    if (options.clear) {
      this.#commandHistory = [];
      return { stdout: '', stderr: '', exitCode: 0 };
    }
    
    let count = remaining[0] ? parseInt(remaining[0]) : this.#commandHistory.length;
    const start = Math.max(0, this.#commandHistory.length - count);
    
    let output = '';
    for (let i = start; i < this.#commandHistory.length; i++) {
      output += `${String(i + 1).padStart(5)}  ${this.#commandHistory[i]}\n`;
    }
    
    return { stdout: output, stderr: '', exitCode: 0 };
  }

  /**
   * seq - Print sequence of numbers
   */
  #cmdSeq(args) {
    if (args.length === 0) {
      return { stdout: '', stderr: 'seq: missing operand', exitCode: 1 };
    }
    
    let first = 1, increment = 1, last;
    
    if (args.length === 1) {
      last = parseInt(args[0]);
    } else if (args.length === 2) {
      first = parseInt(args[0]);
      last = parseInt(args[1]);
    } else {
      first = parseInt(args[0]);
      increment = parseInt(args[1]);
      last = parseInt(args[2]);
    }
    
    const result = [];
    if (increment > 0) {
      for (let i = first; i <= last; i += increment) {
        result.push(String(i));
      }
    } else if (increment < 0) {
      for (let i = first; i >= last; i += increment) {
        result.push(String(i));
      }
    }
    
    return { stdout: result.join('\n') + '\n', stderr: '', exitCode: 0 };
  }

  /**
   * basename - Strip directory from filename
   */
  #cmdBasename(args) {
    if (args.length === 0) {
      return { stdout: '', stderr: 'basename: missing operand', exitCode: 1 };
    }
    
    let result = args[0].split('/').pop() || '';
    
    // Remove suffix if provided
    if (args[1] && result.endsWith(args[1])) {
      result = result.slice(0, -args[1].length);
    }
    
    return { stdout: result + '\n', stderr: '', exitCode: 0 };
  }

  /**
   * dirname - Strip last component from filename
   */
  #cmdDirname(args) {
    if (args.length === 0) {
      return { stdout: '', stderr: 'dirname: missing operand', exitCode: 1 };
    }
    
    const parts = args[0].split('/');
    parts.pop();
    const result = parts.join('/') || (args[0].startsWith('/') ? '/' : '.');
    
    return { stdout: result + '\n', stderr: '', exitCode: 0 };
  }

  /**
   * realpath / readlink - Print resolved path
   */
  #cmdRealpath(args) {
    if (args.length === 0) {
      return { stdout: '', stderr: 'realpath: missing operand', exitCode: 1 };
    }
    
    const resolved = this.#resolvePath(args[0]);
    return { stdout: resolved + '\n', stderr: '', exitCode: 0 };
  }

  /**
   * tee - Read from stdin and write to stdout and files
   */
  async #cmdTee(args, stdin) {
    const { options, args: files } = this.#parseOptions(args, {
      'append': { short: 'a', type: 'boolean', default: false }
    });
    
    // Write to files
    for (const file of files) {
      const resolvedPath = this.#resolvePath(file);
      try {
        if (options.append) {
          const existing = await agentfs.readFile(resolvedPath, 'utf-8') || '';
          await agentfs.writeFile(resolvedPath, existing + stdin);
        } else {
          await agentfs.writeFile(resolvedPath, stdin);
        }
      } catch (err) {
        return { stdout: stdin, stderr: `tee: ${file}: ${err.message}`, exitCode: 1 };
      }
    }
    
    // Also output to stdout
    return { stdout: stdin, stderr: '', exitCode: 0 };
  }

  /**
   * xargs - Build and execute commands from stdin
   */
  async #cmdXargs(args, stdin) {
    if (!stdin) {
      return { stdout: '', stderr: '', exitCode: 0 };
    }
    
    const cmd = args[0] || 'echo';
    const cmdArgs = args.slice(1);
    const inputArgs = stdin.trim().split(/\s+/).filter(a => a);
    
    // Execute command with collected arguments
    const result = await this.#executeBuiltin(cmd, [...cmdArgs, ...inputArgs], '');
    return result;
  }

  /**
   * sleep - Delay for specified time
   */
  async #cmdSleep(args) {
    if (args.length === 0) {
      return { stdout: '', stderr: 'sleep: missing operand', exitCode: 1 };
    }
    
    const seconds = parseFloat(args[0]) || 0;
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    
    return { stdout: '', stderr: '', exitCode: 0 };
  }

  /**
   * yes - Output a string repeatedly (limited)
   */
  #cmdYes(args) {
    const text = args.length > 0 ? args.join(' ') : 'y';
    // Output limited times to prevent infinite output
    const output = (text + '\n').repeat(10);
    return { stdout: output, stderr: '', exitCode: 0 };
  }

  /**
   * expr - Evaluate expressions
   */
  #cmdExpr(args) {
    if (args.length === 0) {
      return { stdout: '', stderr: 'expr: missing operand', exitCode: 2 };
    }
    
    const expr = args.join(' ');
    
    try {
      // Simple arithmetic evaluation (safe subset)
      const sanitized = expr.replace(/[^0-9+\-*/() ]/g, '');
      const result = Function(`"use strict"; return (${sanitized})`)();
      return { stdout: String(result) + '\n', stderr: '', exitCode: result === 0 ? 1 : 0 };
    } catch (e) {
      return { stdout: '', stderr: 'expr: syntax error', exitCode: 2 };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Git Commands
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * git - Git commands
   */
  async #cmdGit(args) {
    const subcommand = args[0];
    
    if (!subcommand) {
      const help = `usage: git <command> [<args>]

Commands:
   init       Create an empty Git repository
   status     Show the working tree status
   add        Add file contents to the index
   commit     Record changes to the repository
   log        Show commit logs
   clone      Clone a repository
`;
      return { stdout: help, stderr: '', exitCode: 0 };
    }
    
    // Initialize wasm-git if needed
    if (!this.#gitInitialized) {
      try {
        await this.#initGit();
      } catch (e) {
        return { stdout: '', stderr: `git: initialization failed: ${e.message}`, exitCode: 1 };
      }
    }
    
    switch (subcommand) {
      case 'init':
        return await this.#gitInit();
      case 'status':
        return await this.#gitStatus();
      case 'add':
        return await this.#gitAdd(args.slice(1));
      case 'commit':
        return await this.#gitCommit(args.slice(1));
      case 'log':
        return await this.#gitLog();
      case 'clone':
        return await this.#gitClone(args.slice(1));
      case 'diff':
        return await this.#gitDiff(args.slice(1));
      case 'branch':
        return await this.#gitBranch(args.slice(1));
      default:
        return { stdout: '', stderr: `git: '${subcommand}' is not a git command`, exitCode: 1 };
    }
  }

  /**
   * Initialize wasm-git
   */
  async #initGit() {
    try {
      const { initWasmGit } = await import('../vendor/wasm-git/index.js');
      this.#lg2 = await initWasmGit();
      this.#gitInitialized = true;
    } catch (err) {
      // Fallback to simple git simulation
      this.#gitInitialized = true;
    }
  }

  /**
   * git init
   */
  async #gitInit() {
    try {
      const gitPath = this.#resolvePath('.git');
      await agentfs.writeJSON(`${gitPath}/config`, {
        core: { repositoryformatversion: 0, filemode: true, bare: false }
      });
      await agentfs.writeFile(`${gitPath}/HEAD`, 'ref: refs/heads/main\n');
      
      const agent = await agentfs.getAgent();
      await agent.fs.mkdir(`${gitPath}/objects`).catch(() => {});
      await agent.fs.mkdir(`${gitPath}/refs`).catch(() => {});
      await agent.fs.mkdir(`${gitPath}/refs/heads`).catch(() => {});
      
      return { 
        stdout: `\x1b[38;2;107;158;126mInitialized empty Git repository in ${this.#cwd}/.git/\x1b[0m\n`, 
        stderr: '', 
        exitCode: 0 
      };
    } catch (err) {
      return { stdout: '', stderr: `git init failed: ${err.message}`, exitCode: 1 };
    }
  }

  /**
   * git status
   */
  async #gitStatus() {
    try {
      const gitPath = this.#resolvePath('.git');
      const exists = await agentfs.exists(gitPath);
      
      if (!exists) {
        return { stdout: '', stderr: 'fatal: not a git repository', exitCode: 128 };
      }
      
      const head = await agentfs.readFile(`${gitPath}/HEAD`, 'utf-8');
      const branch = head?.trim().replace('ref: refs/heads/', '') || 'main';
      
      let output = `On branch \x1b[38;2;107;158;126m${branch}\x1b[0m\n\n`;
      
      // Check for staged files
      const index = await agentfs.readJSON(`${gitPath}/index`) || { files: [] };
      
      if (index.files.length > 0) {
        output += 'Changes to be committed:\n';
        output += '  (use "git restore --staged <file>..." to unstage)\n\n';
        for (const file of index.files) {
          output += `\t\x1b[38;2;107;158;126mnew file:   ${file}\x1b[0m\n`;
        }
        output += '\n';
      }
      
      // List untracked files
      const entries = await agentfs.readdir(this.#cwd);
      const untracked = entries.filter(e => e !== '.git' && !index.files.includes(e));
      
      if (untracked.length > 0) {
        output += 'Untracked files:\n';
        output += '  (use "git add <file>..." to include in what will be committed)\n\n';
        for (const file of untracked) {
          output += `\t\x1b[38;2;200;69;54m${file}\x1b[0m\n`;
        }
      } else if (index.files.length === 0) {
        output += 'nothing to commit, working tree clean\n';
      }
      
      return { stdout: output, stderr: '', exitCode: 0 };
    } catch (err) {
      return { stdout: '', stderr: `git status failed: ${err.message}`, exitCode: 1 };
    }
  }

  /**
   * git add
   */
  async #gitAdd(files) {
    if (files.length === 0) {
      return { stdout: '', stderr: 'Nothing specified, nothing added.', exitCode: 1 };
    }
    
    try {
      const gitPath = this.#resolvePath('.git');
      const exists = await agentfs.exists(gitPath);
      
      if (!exists) {
        return { stdout: '', stderr: 'fatal: not a git repository', exitCode: 128 };
      }
      
      const indexPath = `${gitPath}/index`;
      let index = await agentfs.readJSON(indexPath) || { files: [] };
      
      for (const file of files) {
        if (file === '.' || file === '-A' || file === '--all') {
          const entries = await agentfs.readdir(this.#cwd);
          index.files = entries.filter(e => e !== '.git');
        } else {
          if (!index.files.includes(file)) {
            index.files.push(file);
          }
        }
      }
      
      await agentfs.writeJSON(indexPath, index);
      return { stdout: '', stderr: '', exitCode: 0 };
    } catch (err) {
      return { stdout: '', stderr: `git add failed: ${err.message}`, exitCode: 1 };
    }
  }

  /**
   * git commit
   */
  async #gitCommit(args) {
    const mIndex = args.indexOf('-m');
    const message = mIndex !== -1 ? args[mIndex + 1] : null;
    
    if (!message) {
      return { stdout: '', stderr: "error: switch 'm' requires a value", exitCode: 1 };
    }
    
    try {
      const gitPath = this.#resolvePath('.git');
      const exists = await agentfs.exists(gitPath);
      
      if (!exists) {
        return { stdout: '', stderr: 'fatal: not a git repository', exitCode: 128 };
      }
      
      const index = await agentfs.readJSON(`${gitPath}/index`) || { files: [] };
      
      if (index.files.length === 0) {
        return { stdout: '', stderr: 'nothing to commit', exitCode: 1 };
      }
      
      const commit = {
        id: Date.now().toString(36),
        message,
        files: [...index.files],
        timestamp: new Date().toISOString(),
        author: 'clawd <clawd@clawdbot.com>'
      };
      
      const logsPath = `${gitPath}/logs`;
      let logs = await agentfs.readJSON(logsPath) || [];
      logs.push(commit);
      await agentfs.writeJSON(logsPath, logs);
      
      await agentfs.writeJSON(`${gitPath}/index`, { files: [] });
      
      const output = `[\x1b[38;2;107;158;126mmain ${commit.id}\x1b[0m] ${message}\n ${index.files.length} file(s) changed\n`;
      return { stdout: output, stderr: '', exitCode: 0 };
    } catch (err) {
      return { stdout: '', stderr: `git commit failed: ${err.message}`, exitCode: 1 };
    }
  }

  /**
   * git log
   */
  async #gitLog() {
    try {
      const gitPath = this.#resolvePath('.git');
      const logs = await agentfs.readJSON(`${gitPath}/logs`) || [];
      
      if (logs.length === 0) {
        return { stdout: 'No commits yet\n', stderr: '', exitCode: 0 };
      }
      
      let output = '';
      for (const commit of [...logs].reverse()) {
        output += `\x1b[38;2;212;165;116mcommit ${commit.id}\x1b[0m\n`;
        output += `Author: ${commit.author}\n`;
        output += `Date:   ${new Date(commit.timestamp).toLocaleString()}\n\n`;
        output += `    ${commit.message}\n\n`;
      }
      
      return { stdout: output, stderr: '', exitCode: 0 };
    } catch (err) {
      return { stdout: '', stderr: `git log failed: ${err.message}`, exitCode: 1 };
    }
  }

  /**
   * git clone
   */
  async #gitClone(args) {
    const url = args[0];
    const dest = args[1] || url?.split('/').pop()?.replace('.git', '') || 'repo';
    
    if (!url) {
      return { stdout: '', stderr: 'usage: git clone <url> [<directory>]', exitCode: 1 };
    }
    
    let output = `Cloning into '${dest}'...\n`;
    output += '\x1b[38;2;138;134;130mNote: Full git clone requires network access and is simulated in this environment.\x1b[0m\n';
    
    try {
      const agent = await agentfs.getAgent();
      const destPath = this.#resolvePath(dest);
      await agent.fs.mkdir(destPath).catch(() => {});
      await agent.fs.mkdir(`${destPath}/.git`).catch(() => {});
      
      await agentfs.writeFile(`${destPath}/.git/HEAD`, 'ref: refs/heads/main\n');
      await agentfs.writeJSON(`${destPath}/.git/config`, {
        core: { repositoryformatversion: 0, filemode: true, bare: false },
        remote: { origin: { url } }
      });
      
      output += `\x1b[38;2;107;158;126mCloned ${url} to ${dest}/\x1b[0m\n`;
      return { stdout: output, stderr: '', exitCode: 0 };
    } catch (err) {
      return { stdout: output, stderr: `git clone failed: ${err.message}`, exitCode: 1 };
    }
  }

  /**
   * git diff
   */
  async #gitDiff(args) {
    try {
      const gitPath = this.#resolvePath('.git');
      const exists = await agentfs.exists(gitPath);
      
      if (!exists) {
        return { stdout: '', stderr: 'fatal: not a git repository', exitCode: 128 };
      }
      
      // Simple diff showing staged files
      const index = await agentfs.readJSON(`${gitPath}/index`) || { files: [] };
      
      if (index.files.length === 0) {
        return { stdout: '', stderr: '', exitCode: 0 };
      }
      
      let output = '';
      for (const file of index.files) {
        try {
          const content = await agentfs.readFile(this.#resolvePath(file), 'utf-8');
          if (content) {
            output += `\x1b[1mdiff --git a/${file} b/${file}\x1b[0m\n`;
            output += `new file mode 100644\n`;
            output += `--- /dev/null\n`;
            output += `+++ b/${file}\n`;
            const lines = content.split('\n');
            output += `@@ -0,0 +1,${lines.length} @@\n`;
            for (const line of lines) {
              output += `\x1b[32m+${line}\x1b[0m\n`;
            }
          }
        } catch (e) {
          // Skip unreadable files
        }
      }
      
      return { stdout: output, stderr: '', exitCode: 0 };
    } catch (err) {
      return { stdout: '', stderr: `git diff failed: ${err.message}`, exitCode: 1 };
    }
  }

  /**
   * git branch
   */
  async #gitBranch(args) {
    try {
      const gitPath = this.#resolvePath('.git');
      const exists = await agentfs.exists(gitPath);
      
      if (!exists) {
        return { stdout: '', stderr: 'fatal: not a git repository', exitCode: 128 };
      }
      
      const head = await agentfs.readFile(`${gitPath}/HEAD`, 'utf-8');
      const currentBranch = head?.trim().replace('ref: refs/heads/', '') || 'main';
      
      if (args.length === 0) {
        // List branches
        return { stdout: `* \x1b[38;2;107;158;126m${currentBranch}\x1b[0m\n`, stderr: '', exitCode: 0 };
      }
      
      // Create new branch
      const newBranch = args[0];
      const agent = await agentfs.getAgent();
      await agent.fs.mkdir(`${gitPath}/refs/heads`).catch(() => {});
      await agentfs.writeFile(`${gitPath}/refs/heads/${newBranch}`, 'initial\n');
      
      return { stdout: '', stderr: '', exitCode: 0 };
    } catch (err) {
      return { stdout: '', stderr: `git branch failed: ${err.message}`, exitCode: 1 };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Utility Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Format file size for human readability
   */
  #formatSize(bytes) {
    if (bytes === 0) return '0B';
    const units = ['B', 'K', 'M', 'G', 'T'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    return size.toFixed(i > 0 ? 1 : 0) + units[i];
  }

  /**
   * Update path display in header
   */
  #updatePathDisplay() {
    if (this.#pathDisplay) {
      this.#pathDisplay.textContent = this.#cwd;
    }
  }

  /**
   * Navigate up one directory
   */
  #navigateUp() {
    if (this.#cwd === '/') return;
    
    const parts = this.#cwd.split('/').filter(Boolean);
    parts.pop();
    this.#cwd = '/' + parts.join('/') || '/';
    this.#updatePathDisplay();
    
    // Show feedback in terminal
    this.#terminal?.write(`\r\n\x1b[38;2;138;134;130mcd ${this.#cwd}\x1b[0m\r\n`);
    this.#showPrompt();
  }

  /**
   * Handle window resize
   */
  #handleResize() {
    if (this.hasAttribute('open') && this.#fitAddon) {
      this.#fitAddon.fit();
    }
  }

  /**
   * Handle keyboard events
   */
  #handleKeyDown(e) {
    if (e.key === 'Escape') {
      this.close();
    }
  }

  /**
   * Check if open
   */
  get isOpen() {
    return this.hasAttribute('open');
  }

  /**
   * Get current working directory
   */
  get cwd() {
    return this.#cwd;
  }
}

customElements.define('commands-app', CommandsApp);
