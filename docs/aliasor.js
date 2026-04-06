/**
 * Pango Lineage Aliasor - JavaScript port
 * Translates between aliased and unaliased SARS-CoV-2 Pango lineage designations.
 *
 * Ported from the Python pango_aliasor library by Cornelius Roemer.
 */
class Aliasor {
  /**
   * @param {Object} aliasData - Parsed alias_key.json object
   */
  constructor(aliasData) {
    this.aliasDict = {};
    for (const [key, value] of Object.entries(aliasData)) {
      if (Array.isArray(value) || value === "") {
        this.aliasDict[key] = key;
      } else {
        this.aliasDict[key] = value;
      }
    }
    this.realiasDict = {};
    for (const [key, value] of Object.entries(this.aliasDict)) {
      this.realiasDict[value] = key;
    }
  }

  /**
   * Load an Aliasor from a URL (fetches alias_key.json).
   * @param {string} url
   * @returns {Promise<Aliasor>}
   */
  static async fromURL(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch alias data: ${response.status}`);
    }
    const data = await response.json();
    return new Aliasor(data);
  }

  /**
   * Compress a full (unaliased) lineage name into its aliased form.
   * e.g. "B.1.1.529.1" -> "BA.1"
   * @param {string} name
   * @returns {string}
   */
  compress(name) {
    if (!name) return name;
    const nameSplit = name.split(".");
    const levels = nameSplit.length - 1;
    const numIndirections = Math.floor((levels - 1) / 3);
    if (numIndirections <= 0) return name;
    const alias = nameSplit.slice(0, 3 * numIndirections + 1).join(".");
    const ending = nameSplit.slice(3 * numIndirections + 1).join(".");
    return this.realiasDict[alias] + "." + ending;
  }

  /**
   * Uncompress an aliased lineage name into its full form.
   * e.g. "BA.5" -> "B.1.1.529.5"
   * @param {string} name
   * @returns {string}
   */
  uncompress(name) {
    if (!name) return name;
    const nameSplit = name.split(".");
    const letter = nameSplit[0];
    const unaliased = this.aliasDict[letter];
    if (unaliased === undefined) return name;
    if (nameSplit.length === 1) return name;
    return unaliased + "." + nameSplit.slice(1).join(".");
  }

  /**
   * Returns the parent lineage in aliased format, or "" if at top level.
   * @param {string} name
   * @returns {string}
   */
  parent(name) {
    if (!name) return "";
    const uncompressed = this.uncompress(name);
    const parts = uncompressed.split(".");
    if (parts.length <= 1) return "";
    return this.compress(parts.slice(0, -1).join("."));
  }

  /**
   * Partially compress a lineage up to a given indirection level,
   * optionally restricted to a set of accepted aliases.
   * @param {string} name
   * @param {number} upTo - Indirection level to compress up to (default 0)
   * @param {Set<string>|Array<string>} acceptedAliases - Set of accepted alias names (default empty)
   * @returns {string}
   */
  partialCompress(name, upTo = 0, acceptedAliases = new Set()) {
    if (!name) return name;
    if (Array.isArray(acceptedAliases)) {
      acceptedAliases = new Set(acceptedAliases);
    }
    const nameSplit = name.split(".");
    const levels = nameSplit.length - 1;
    const indirections = Math.floor((levels - 1) / 3);

    let alias = nameSplit[0];

    if (upTo > 0) {
      if (indirections <= upTo) {
        return this.compress(name);
      }
      const toAlias = nameSplit.slice(0, 3 * upTo + 1).join(".");
      alias = this.realiasDict[toAlias];
    }

    // Check if levels beyond upTo (working backwards) are in acceptedAliases
    if (acceptedAliases.size > 0) {
      for (let level = indirections; level > upTo; level--) {
        const toAlias = nameSplit.slice(0, 3 * level + 1).join(".");
        if (Object.prototype.hasOwnProperty.call(this.realiasDict, toAlias)) {
          if (acceptedAliases.has(this.realiasDict[toAlias])) {
            alias = this.realiasDict[toAlias];
            return alias + "." + nameSplit.slice(3 * level + 1).join(".");
          }
        }
      }
    }

    const remaining = nameSplit.slice(3 * upTo + 1);
    if (remaining.length === 0) return alias;
    return alias + "." + remaining.join(".");
  }
}

// Export for both browser and Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = Aliasor;
}
