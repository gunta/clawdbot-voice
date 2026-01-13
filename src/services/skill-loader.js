/**
 * Skill Loader Service
 * Parses SKILL.md files following the Agent Skills specification
 * 
 * @see https://agentskills.io/specification
 * @module SkillLoader
 */

import * as agentfs from './agentfs.js';
import { parseFrontmatter } from '../vendor/yaml-parser.js';

/**
 * @typedef {Object} Skill
 * @property {string} name - Skill identifier (1-64 chars, lowercase, hyphens)
 * @property {string} description - What the skill does (1-1024 chars)
 * @property {string} [license] - License name
 * @property {string} [compatibility] - Environment requirements
 * @property {Object} [metadata] - Arbitrary key-value pairs
 * @property {string[]} allowedTools - Tools the skill may use
 * @property {string} instructions - Body content (instructions for agents)
 * @property {string} basePath - Path to skill directory
 * @property {string} pluginName - Parent plugin name
 */

class SkillLoader extends EventTarget {
  /** @type {Map<string, Skill>} */
  #cache = new Map();

  /**
   * Parse a SKILL.md file
   * @param {string} path - Path to SKILL.md
   * @param {string} pluginName - Parent plugin name
   * @returns {Promise<Skill>}
   */
  async parseSkill(path, pluginName) {
    const cacheKey = path;
    
    if (this.#cache.has(cacheKey)) {
      return this.#cache.get(cacheKey);
    }

    const content = await agentfs.readFile(path, 'utf-8');
    if (!content) {
      throw new Error(`Skill file not found: ${path}`);
    }

    const { frontmatter, body } = parseFrontmatter(content);

    // Validate required fields per agentskills.io spec
    this.#validateFrontmatter(frontmatter, path);

    const skill = {
      // Required fields
      name: frontmatter.name,
      description: frontmatter.description,

      // Optional fields
      license: frontmatter.license || null,
      compatibility: frontmatter.compatibility || null,
      metadata: frontmatter.metadata || {},
      allowedTools: this.#parseAllowedTools(frontmatter['allowed-tools']),

      // Body content
      instructions: body.trim(),

      // Paths
      basePath: path.replace('/SKILL.md', ''),
      pluginName,
    };

    this.#cache.set(cacheKey, skill);
    
    this.dispatchEvent(new CustomEvent('skill-loaded', { detail: skill }));
    
    return skill;
  }

  /**
   * Validate frontmatter per agentskills.io spec
   * @param {Object} fm - Frontmatter object
   * @param {string} path - File path (for error messages)
   */
  #validateFrontmatter(fm, path) {
    // Required: name
    if (!fm.name) {
      throw new Error(`SKILL.md missing required 'name' field: ${path}`);
    }

    // Required: description
    if (!fm.description) {
      throw new Error(`SKILL.md missing required 'description' field: ${path}`);
    }

    // Name format validation
    // - 1-64 characters
    // - lowercase alphanumeric + hyphens
    // - no consecutive hyphens
    // - must not start or end with hyphen
    const nameRegex = /^[a-z]([a-z0-9-]*[a-z0-9])?$/;
    if (fm.name.length > 64) {
      console.warn(`[SkillLoader] Name exceeds 64 chars: ${fm.name}`);
    }
    if (!nameRegex.test(fm.name)) {
      console.warn(`[SkillLoader] Invalid name format (should be lowercase, hyphens): ${fm.name}`);
    }
    if (fm.name.includes('--')) {
      console.warn(`[SkillLoader] Name contains consecutive hyphens: ${fm.name}`);
    }

    // Description: 1-1024 chars
    if (fm.description.length > 1024) {
      console.warn(`[SkillLoader] Description exceeds 1024 chars: ${path}`);
    }

    // Compatibility: max 500 chars
    if (fm.compatibility && fm.compatibility.length > 500) {
      console.warn(`[SkillLoader] Compatibility exceeds 500 chars: ${path}`);
    }
  }

  /**
   * Parse allowed-tools field (space-delimited)
   * @param {string} str - Space-delimited tool names
   * @returns {string[]}
   */
  #parseAllowedTools(str) {
    if (!str) return [];
    if (Array.isArray(str)) return str;
    return String(str).split(/\s+/).filter(Boolean);
  }

  /**
   * Get a skill by name (searches across all loaded skills)
   * @param {string} name - Skill name
   * @returns {Skill|null}
   */
  getSkillByName(name) {
    for (const skill of this.#cache.values()) {
      if (skill.name === name) {
        return skill;
      }
    }
    return null;
  }

  /**
   * Get all loaded skills
   * @returns {Skill[]}
   */
  getAllSkills() {
    return Array.from(this.#cache.values());
  }

  /**
   * Load references for a skill on demand (progressive disclosure)
   * @param {Skill} skill - Skill object
   * @returns {Promise<Object>} Map of filename to content
   */
  async loadReferences(skill) {
    const refsPath = `${skill.basePath}/references`;
    
    try {
      const files = await agentfs.readdir(refsPath);
      const refs = {};
      
      for (const file of files) {
        try {
          refs[file] = await agentfs.readFile(`${refsPath}/${file}`, 'utf-8');
        } catch {
          // Skip files that can't be read
        }
      }
      
      return refs;
    } catch {
      // No references directory
      return {};
    }
  }

  /**
   * Load scripts for a skill on demand
   * @param {Skill} skill - Skill object
   * @returns {Promise<Object>} Map of filename to content
   */
  async loadScripts(skill) {
    const scriptsPath = `${skill.basePath}/scripts`;
    
    try {
      const files = await agentfs.readdir(scriptsPath);
      const scripts = {};
      
      for (const file of files) {
        try {
          scripts[file] = await agentfs.readFile(`${scriptsPath}/${file}`, 'utf-8');
        } catch {
          // Skip files that can't be read
        }
      }
      
      return scripts;
    } catch {
      // No scripts directory
      return {};
    }
  }

  /**
   * Load assets for a skill on demand
   * @param {Skill} skill - Skill object
   * @returns {Promise<string[]>} List of asset filenames
   */
  async listAssets(skill) {
    const assetsPath = `${skill.basePath}/assets`;
    
    try {
      return await agentfs.readdir(assetsPath);
    } catch {
      return [];
    }
  }

  /**
   * Get full skill content with references (for agent context)
   * @param {string} name - Skill name
   * @param {boolean} includeRefs - Whether to include references
   * @returns {Promise<Object|null>}
   */
  async getSkillContent(name, includeRefs = false) {
    const skill = this.getSkillByName(name);
    if (!skill) return null;

    const result = {
      name: skill.name,
      description: skill.description,
      instructions: skill.instructions,
      allowedTools: skill.allowedTools,
    };

    if (includeRefs) {
      result.references = await this.loadReferences(skill);
    }

    return result;
  }

  /**
   * Invalidate cache for a skill
   * @param {string} path - Skill path
   */
  invalidate(path) {
    this.#cache.delete(path);
  }

  /**
   * Invalidate all skills for a plugin
   * @param {string} pluginName - Plugin name
   */
  invalidatePlugin(pluginName) {
    for (const [path, skill] of this.#cache.entries()) {
      if (skill.pluginName === pluginName) {
        this.#cache.delete(path);
      }
    }
  }

  /**
   * Clear all cached skills
   */
  clearCache() {
    this.#cache.clear();
  }
}

// Export singleton
export const skillLoader = new SkillLoader();

// Also export class for testing
export { SkillLoader };
