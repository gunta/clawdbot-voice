/**
 * Plugin Installer Utility
 * Helps install plugins into OS1's AgentFS
 * 
 * @module PluginInstaller
 */

import * as agentfs from '../services/agentfs.js';

/**
 * Ensure a directory path exists by creating all parent directories
 * @param {string} dirPath - Full directory path
 */
async function ensureDir(dirPath) {
  const parts = dirPath.split('/').filter(Boolean);
  let current = '';
  
  for (const part of parts) {
    current += '/' + part;
    try {
      await agentfs.mkdir(current);
    } catch (err) {
      // Ignore EEXIST errors
      if (!err.message?.includes('EEXIST')) {
        // Directory might already exist, that's ok
      }
    }
  }
}

/**
 * Install a plugin from a structured object
 * @param {string} pluginName - Plugin name
 * @param {Object} files - Map of relative paths to file contents
 * @returns {Promise<void>}
 */
export async function installPlugin(pluginName, files) {
  await agentfs.init();
  
  const basePath = `/plugins/${pluginName}`;
  
  // Create base directory
  await ensureDir(basePath);
  
  // Create all directories and write files
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = `${basePath}/${relativePath}`;
    const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
    
    // Ensure directory exists (create full path recursively)
    await ensureDir(dir);
    
    // Write file
    if (typeof content === 'object') {
      await agentfs.writeJSON(fullPath, content);
    } else {
      await agentfs.writeFile(fullPath, content);
    }
    
    console.log(`[PluginInstaller] Wrote: ${relativePath}`);
  }
  
  console.log(`[PluginInstaller] Installed: ${pluginName}`);
}

/**
 * Install the hello-world sample plugin
 * @returns {Promise<void>}
 */
export async function installHelloWorld() {
  await installPlugin('hello-world', {
    '.claude-plugin/plugin.json': {
      name: 'hello-world',
      version: '1.0.0',
      description: 'A simple greeting plugin demonstrating all OS1 plugin features',
      author: { name: 'OS1 Team' },
      license: 'MIT',
      keywords: ['hello', 'greeting', 'demo'],
      skills: './skills',
      commands: './commands',
      hooks: './hooks/hooks.json',
      components: './components',
    },
    
    'skills/greet/SKILL.md': `---
name: greet
description: Greets users warmly. Use when user says hello, hi, or requests a greeting.
license: MIT
metadata:
  author: os1-team
  version: "1.0"
compatibility: OS1 voice-first environment
allowed-tools: voice.speak
---

# Greet Skill

This skill provides friendly greetings for OS1 users.

## Instructions

When activated:
1. Use voice.speak to say a warm greeting
2. Optionally show the hello-badge component
3. Keep the greeting brief and cheerful

## Examples

User: "Hello"
Action: voice.speak("Hello! How can I help you today?")

User: "Hi there"
Action: voice.speak("Hi! Nice to hear from you.")
`,
    
    'commands/say-hello.md': `---
name: say-hello
description: Voice command to trigger a greeting
trigger: voice
phrases:
  - "say hello"
  - "greet me"
  - "hello"
  - "hi"
---

# Say Hello Command

Activates the greet skill and shows the hello badge component.
`,
    
    'hooks/hooks.json': {
      hooks: [
        {
          event: 'on-navigate',
          config: { app: 'files' },
          action: 'component:show:hello-badge',
        },
        {
          event: 'on-boot',
          config: {},
          action: 'skill:greet',
        },
      ],
    },
    
    'components/hello-badge/index.js': `import { html } from 'htm/preact';
import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';

export default function HelloBadge({ host }) {
  const visible = useSignal(true);
  const message = useSignal('Hello from a plugin!');
  
  useEffect(() => {
    const timer = setTimeout(() => { visible.value = false; }, 5000);
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    host.show = () => { visible.value = true; };
    host.hide = () => { visible.value = false; };
    host.setMessage = (msg) => { message.value = msg; };
  }, []);
  
  if (!visible.value) return null;
  
  return html\`
    <div class="badge" onClick=\${() => visible.value = false}>
      <span class="wave">👋</span>
      <span class="text">\${message}</span>
      <button class="close" type="button">×</button>
    </div>
  \`;
}
`,
    
    'components/hello-badge/styles.css': `.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(200, 69, 54, 0.1);
  border: 1px solid rgba(200, 69, 54, 0.3);
  border-radius: 24px;
  font-size: 14px;
  color: var(--color-text, #e8e4e0);
  cursor: pointer;
  animation: slide-in 0.3s ease-out;
}

.wave {
  font-size: 18px;
  animation: wave 1s ease-in-out infinite;
}

.close {
  width: 20px;
  height: 20px;
  background: transparent;
  border: none;
  border-radius: 50%;
  color: inherit;
  opacity: 0.5;
  cursor: pointer;
}

@keyframes wave {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(20deg); }
  75% { transform: rotate(-10deg); }
}

@keyframes slide-in {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
`,
    
    'PLUGIN.md': `# Hello World Plugin

A simple demonstration plugin for OS1 showcasing all plugin features.

## Features

- **Skill**: \`greet\` - Provides friendly greetings
- **Command**: \`say-hello\` - Voice command to trigger greetings
- **Hook**: Shows badge when navigating to Files app
- **Component**: \`hello-badge\` - A cheerful greeting badge
`,
  });
}

/**
 * Uninstall a plugin
 * @param {string} pluginName - Plugin name
 * @returns {Promise<void>}
 */
export async function uninstallPlugin(pluginName) {
  await agentfs.init();
  
  const basePath = `/plugins/${pluginName}`;
  
  // Delete plugin directory recursively
  const deleteRecursive = async (path) => {
    try {
      const entries = await agentfs.readdir(path);
      
      for (const entry of entries) {
        const fullPath = `${path}/${entry}`;
        const stat = await agentfs.stat(fullPath).catch(() => null);
        
        if (stat?.isDirectory) {
          await deleteRecursive(fullPath);
        } else {
          await agentfs.deleteFile(fullPath);
        }
      }
      
      // Delete the directory itself (AgentFS may not support rmdir, so we skip if not)
    } catch (err) {
      console.error(`[PluginInstaller] Delete error:`, err);
    }
  };
  
  await deleteRecursive(basePath);
  console.log(`[PluginInstaller] Uninstalled: ${pluginName}`);
}

// Expose globally for console access
if (typeof window !== 'undefined') {
  window.installPlugin = installPlugin;
  window.installHelloWorld = installHelloWorld;
  window.uninstallPlugin = uninstallPlugin;
}

export default {
  installPlugin,
  installHelloWorld,
  uninstallPlugin,
};
