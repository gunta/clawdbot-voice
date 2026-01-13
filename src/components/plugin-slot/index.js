/**
 * Plugin Slot Component
 * Host element for plugin components that supports hot-reload
 * 
 * Since customElements.define() can only be called once per tag,
 * we use this host element to render plugin components dynamically.
 * On hot-reload, we re-render without re-registering the element.
 * 
 * Usage:
 *   <os1-plugin-slot plugin="hello-world" component="hello-badge"></os1-plugin-slot>
 * 
 * @module PluginSlot
 */

import { html } from 'htm/preact';
import { useSignal, useSignalEffect } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { createShadowComponent } from '../shared/shadow-component.js';
import { pluginModuleLoader } from '../../services/plugin-module-loader.js';
import { pluginLoader } from '../../services/plugin-loader.js';

/**
 * Plugin Slot Preact Component
 */
function PluginSlot({ host }) {
  const content = useSignal(null);
  const styles = useSignal('');
  const error = useSignal(null);
  const loading = useSignal(true);
  
  const pluginName = useSignal(host.getAttribute('plugin') || '');
  const componentName = useSignal(host.getAttribute('component') || '');
  
  const containerRef = useRef(null);

  /**
   * Load the plugin component
   */
  const loadComponent = async () => {
    const plugin = pluginName.value;
    const component = componentName.value;
    
    if (!plugin || !component) {
      error.value = 'Missing plugin or component attribute';
      loading.value = false;
      return;
    }
    
    loading.value = true;
    error.value = null;
    
    try {
      const basePath = `/plugins/${plugin}/components/${component}`;
      const { module, styles: css } = await pluginModuleLoader.loadComponent(basePath);
      
      // Get the default export
      const Component = module.default || module;
      
      if (typeof Component !== 'function') {
        throw new Error(`No valid component export from ${basePath}/index.js`);
      }
      
      content.value = Component;
      styles.value = css;
      error.value = null;
      
      // Dispatch loaded event
      host.dispatchEvent(new CustomEvent('component-loaded', {
        detail: { plugin, component },
        bubbles: true,
      }));
      
    } catch (err) {
      console.error(`[PluginSlot] Failed to load ${plugin}/${component}:`, err);
      error.value = err.message;
      content.value = null;
    } finally {
      loading.value = false;
    }
  };

  // Load on mount
  useEffect(() => {
    loadComponent();
  }, []);

  // Watch for attribute changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          const newPlugin = host.getAttribute('plugin') || '';
          const newComponent = host.getAttribute('component') || '';
          
          if (newPlugin !== pluginName.value || newComponent !== componentName.value) {
            pluginName.value = newPlugin;
            componentName.value = newComponent;
            loadComponent();
          }
        }
      }
    });
    
    observer.observe(host, { attributes: true });
    
    return () => observer.disconnect();
  }, []);

  // Listen for plugin reload events
  useEffect(() => {
    const handleReload = (e) => {
      if (e.detail?.name === pluginName.value || e.detail?.pluginName === pluginName.value) {
        // Invalidate cache and reload
        pluginModuleLoader.invalidatePlugin(pluginName.value);
        loadComponent();
      }
    };
    
    pluginLoader.addEventListener('plugin-reloaded', handleReload);
    pluginModuleLoader.addEventListener('plugin-invalidated', handleReload);
    
    return () => {
      pluginLoader.removeEventListener('plugin-reloaded', handleReload);
      pluginModuleLoader.removeEventListener('plugin-invalidated', handleReload);
    };
  }, []);

  // Expose reload method on host
  useEffect(() => {
    host.reload = () => {
      pluginModuleLoader.invalidatePlugin(pluginName.value);
      loadComponent();
    };
    
    host.getComponentInfo = () => ({
      plugin: pluginName.value,
      component: componentName.value,
      loaded: !!content.value,
      error: error.value,
    });
  }, []);

  // Render error state
  if (error.value) {
    return html`
      <div class="plugin-error">
        <span class="error-icon">⚠️</span>
        <span class="error-text">${error.value}</span>
      </div>
    `;
  }

  // Render loading state
  if (loading.value) {
    return html`
      <div class="plugin-loading">
        <span class="loading-spinner"></span>
      </div>
    `;
  }

  // Render nothing if no component
  if (!content.value) {
    return null;
  }

  // Render the plugin component
  const Component = content.value;
  
  return html`
    <style>${styles.value}</style>
    <div class="plugin-content" ref=${containerRef}>
      <${Component} host=${host} />
    </div>
  `;
}

// Component styles
const styles = `
  :host {
    display: contents;
  }
  
  .plugin-error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: rgba(200, 69, 54, 0.1);
    border: 1px solid rgba(200, 69, 54, 0.3);
    border-radius: 8px;
    color: #C84536;
    font-size: 13px;
  }
  
  .error-icon {
    font-size: 16px;
  }
  
  .plugin-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    opacity: 0.5;
  }
  
  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(200, 69, 54, 0.2);
    border-top-color: #C84536;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .plugin-content {
    display: contents;
  }
`;

// Create and export the shadow component
export default createShadowComponent(PluginSlot, {
  tag: 'os1-plugin-slot',
  styles,
});
