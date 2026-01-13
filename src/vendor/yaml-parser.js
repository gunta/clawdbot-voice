/**
 * Minimal YAML Parser for Frontmatter
 * 
 * Handles the subset of YAML needed for SKILL.md, agent, and command frontmatter:
 * - Key-value pairs (strings, numbers, booleans)
 * - Nested objects (via indentation)
 * - Arrays (both inline [...] and multiline with -)
 * - Quoted strings (single and double)
 * - Comments (#)
 * 
 * This is NOT a full YAML parser. For complex YAML, use js-yaml.
 * 
 * @module YamlParser
 */

/**
 * Parse a YAML string into a JavaScript object
 * @param {string} yaml - YAML string to parse
 * @returns {Object} Parsed object
 */
export function parseYaml(yaml) {
  if (!yaml || typeof yaml !== 'string') {
    return {};
  }

  const lines = yaml.split('\n');
  const result = {};
  const stack = [{ obj: result, indent: -1 }];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) {
      continue;
    }

    // Calculate indentation
    const indent = line.search(/\S/);
    const content = line.trim();

    // Pop stack to find correct parent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;

    // Array item (starts with -)
    if (content.startsWith('- ')) {
      const value = content.slice(2).trim();
      
      // Find or create array
      const parentKey = stack[stack.length - 1].key;
      if (parentKey && !Array.isArray(parent[parentKey])) {
        parent[parentKey] = [];
      }
      
      if (parentKey) {
        parent[parentKey].push(parseValue(value));
      }
      continue;
    }

    // Key-value pair
    const colonIndex = content.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }

    const key = content.slice(0, colonIndex).trim();
    const rawValue = content.slice(colonIndex + 1).trim();

    if (rawValue === '' || rawValue === '|' || rawValue === '>') {
      // Nested object or multiline string
      const nextLine = lines[i + 1];
      if (nextLine) {
        const nextIndent = nextLine.search(/\S/);
        if (nextIndent > indent) {
          // Check if it's an array
          if (nextLine.trim().startsWith('- ')) {
            parent[key] = [];
            stack.push({ obj: parent, indent, key });
          } else {
            // Nested object
            parent[key] = {};
            stack.push({ obj: parent[key], indent });
          }
        } else {
          parent[key] = '';
        }
      } else {
        parent[key] = '';
      }
    } else {
      // Simple value
      parent[key] = parseValue(rawValue);
    }
  }

  return result;
}

/**
 * Parse a YAML value string into appropriate JS type
 * @param {string} value - Value string to parse
 * @returns {*} Parsed value
 */
function parseValue(value) {
  if (!value) return '';

  // Remove quotes
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  // Inline array
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map(v => parseValue(v.trim()));
  }

  // Inline object
  if (value.startsWith('{') && value.endsWith('}')) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return {};
    const obj = {};
    // Simple key: value parsing for inline objects
    inner.split(',').forEach(pair => {
      const [k, v] = pair.split(':').map(s => s.trim());
      if (k && v !== undefined) {
        obj[k] = parseValue(v);
      }
    });
    return obj;
  }

  // Boolean
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Null
  if (value === 'null' || value === '~') return null;

  // Number
  if (/^-?\d+$/.test(value)) {
    return parseInt(value, 10);
  }
  if (/^-?\d+\.\d+$/.test(value)) {
    return parseFloat(value);
  }

  // String (default)
  return value;
}

/**
 * Parse markdown frontmatter (content between --- delimiters)
 * @param {string} content - Full markdown content
 * @returns {{ frontmatter: Object, body: string }}
 */
export function parseFrontmatter(content) {
  if (!content || typeof content !== 'string') {
    return { frontmatter: {}, body: '' };
  }

  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  return {
    frontmatter: parseYaml(match[1]),
    body: match[2] || '',
  };
}

/**
 * Stringify a JavaScript object to YAML
 * @param {Object} obj - Object to stringify
 * @param {number} indent - Current indentation level
 * @returns {string} YAML string
 */
export function stringifyYaml(obj, indent = 0) {
  if (!obj || typeof obj !== 'object') {
    return String(obj);
  }

  const spaces = '  '.repeat(indent);
  const lines = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      lines.push(`${spaces}${key}:`);
    } else if (Array.isArray(value)) {
      lines.push(`${spaces}${key}:`);
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          lines.push(`${spaces}  - ${stringifyYaml(item, indent + 2).trim()}`);
        } else {
          lines.push(`${spaces}  - ${stringifyValue(item)}`);
        }
      }
    } else if (typeof value === 'object') {
      lines.push(`${spaces}${key}:`);
      lines.push(stringifyYaml(value, indent + 1));
    } else {
      lines.push(`${spaces}${key}: ${stringifyValue(value)}`);
    }
  }

  return lines.join('\n');
}

/**
 * Stringify a single value
 * @param {*} value - Value to stringify
 * @returns {string}
 */
function stringifyValue(value) {
  if (typeof value === 'string') {
    // Quote if contains special characters
    if (value.includes(':') || value.includes('#') || value.includes('\n') ||
        value.startsWith(' ') || value.endsWith(' ')) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }
  if (value === null) {
    return 'null';
  }
  return String(value);
}

export default {
  parseYaml,
  parseFrontmatter,
  stringifyYaml,
};
