import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

// The base directory for all cache files
// This is passed as the first CLI argument, or defaults to ~/.logger
const CACHE_BASE = process.argv[2] || path.join(process.env.HOME || process.env.USERPROFILE || ".", ".logger");

// Bundled data directory (ships with the repo, read-only seed data)
const BUNDLED_DIR = process.argv[3] || "";

// Ensure base directory exists
if (!fs.existsSync(CACHE_BASE)) {
  fs.mkdirSync(CACHE_BASE, { recursive: true });
}

// Seed bundled products into cache if no products cache exists yet
function seedBundledData(): void {
  const productsCache = path.join(CACHE_BASE, "products.json");
  if (!fs.existsSync(productsCache) && BUNDLED_DIR) {
    const bundledProducts = path.join(BUNDLED_DIR, "products.json");
    if (fs.existsSync(bundledProducts)) {
      try {
        fs.copyFileSync(bundledProducts, productsCache);
      } catch {
        // Silent fail — will fetch from API on first use
      }
    }
  }
}
seedBundledData();

const server = new McpServer({
  name: "logger-cache",
  version: "1.0.0"
});

// Helper: resolve a cache key to a file path
function resolvePath(key: string): string {
  // Keys use forward slashes, e.g. "calendar/2026-03-11" or "config"
  const safePath = key.replace(/\.\./g, "").replace(/[<>:"|?*]/g, "");
  return path.join(CACHE_BASE, safePath + ".json");
}

// Helper: ensure directory exists for a path
function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Tool: cache_write — write data with timestamp
server.tool(
  "cache_write",
  "Write data to the Logger local cache. Data is stored as JSON with a _cachedAt timestamp.",
  {
    key: z.string().describe("Cache key, e.g. 'config', 'products', 'requests', 'calendar/2026-03-11', 'engagements/abc123', 'logged'"),
    data: z.string().describe("JSON string of the data to cache")
  },
  async ({ key, data }) => {
    try {
      const filePath = resolvePath(key);
      ensureDir(filePath);
      
      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch {
        parsed = data;
      }
      
      const wrapped = {
        _cachedAt: new Date().toISOString(),
        _key: key,
        data: parsed
      };
      
      fs.writeFileSync(filePath, JSON.stringify(wrapped, null, 2), "utf-8");
      
      return {
        content: [{ type: "text", text: `Cached "${key}" at ${wrapped._cachedAt}` }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error writing cache "${key}": ${error.message}` }],
        isError: true
      };
    }
  }
);

// Tool: cache_read — read cached data
server.tool(
  "cache_read",
  "Read data from the Logger local cache. Returns the cached data and when it was cached.",
  {
    key: z.string().describe("Cache key to read, e.g. 'config', 'products', 'calendar/2026-03-11'")
  },
  async ({ key }) => {
    try {
      const filePath = resolvePath(key);
      
      if (!fs.existsSync(filePath)) {
        return {
          content: [{ type: "text", text: JSON.stringify({ exists: false, key }) }]
        };
      }
      
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      
      return {
        content: [{ type: "text", text: JSON.stringify({ exists: true, ...parsed }) }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error reading cache "${key}": ${error.message}` }],
        isError: true
      };
    }
  }
);

// Tool: cache_check — check if cache is fresh
server.tool(
  "cache_check",
  "Check if a cache entry exists and is fresh. Returns whether the cache exists and if it's within the max age.",
  {
    key: z.string().describe("Cache key to check"),
    maxAgeHours: z.number().optional().describe("Maximum age in hours. Default 24 (daily). Use 720 for monthly (30 days).")
  },
  async ({ key, maxAgeHours }) => {
    try {
      const filePath = resolvePath(key);
      const maxAge = (maxAgeHours || 24) * 60 * 60 * 1000; // Convert to ms

      if (!fs.existsSync(filePath)) {
        return {
          content: [{ type: "text", text: JSON.stringify({ exists: false, fresh: false, key }) }]
        };
      }

      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      const cachedAt = new Date(parsed._cachedAt).getTime();
      const age = Date.now() - cachedAt;
      const fresh = age < maxAge;

      return {
        content: [{ type: "text", text: JSON.stringify({
          exists: true,
          fresh,
          key,
          cachedAt: parsed._cachedAt,
          ageHours: Math.round(age / (60 * 60 * 1000) * 10) / 10
        })}]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error checking cache "${key}": ${error.message}` }],
        isError: true
      };
    }
  }
);

// Tool: cache_get — check freshness AND return data in one call (replaces cache_check + cache_read pattern)
server.tool(
  "cache_get",
  "Check if cache is fresh AND return data in a single call. If fresh, returns the data. If stale/missing, returns fresh=false so you know to re-fetch. This replaces the two-step cache_check + cache_read pattern.",
  {
    key: z.string().describe("Cache key to read, e.g. 'requests', 'products', 'calendar/2026-03-11'"),
    maxAgeHours: z.number().optional().describe("Maximum age in hours. Default 24 (daily). Use 720 for monthly (30 days).")
  },
  async ({ key, maxAgeHours }) => {
    try {
      const filePath = resolvePath(key);
      const maxAge = (maxAgeHours || 24) * 60 * 60 * 1000;

      if (!fs.existsSync(filePath)) {
        return {
          content: [{ type: "text", text: JSON.stringify({ exists: false, fresh: false, key }) }]
        };
      }

      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      const cachedAt = new Date(parsed._cachedAt).getTime();
      const age = Date.now() - cachedAt;
      const fresh = age < maxAge;

      if (fresh) {
        return {
          content: [{ type: "text", text: JSON.stringify({ exists: true, fresh: true, ...parsed }) }]
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify({
          exists: true,
          fresh: false,
          key,
          cachedAt: parsed._cachedAt,
          ageHours: Math.round(age / (60 * 60 * 1000) * 10) / 10
        })}]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error reading cache "${key}": ${error.message}` }],
        isError: true
      };
    }
  }
);

// Tool: cache_list — list all cached keys
server.tool(
  "cache_list",
  "List all entries in the Logger cache with their ages.",
  {},
  async () => {
    try {
      const entries: any[] = [];
      
      function scanDir(dir: string, prefix: string = "") {
        if (!fs.existsSync(dir)) return;
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            scanDir(fullPath, prefix ? `${prefix}/${item}` : item);
          } else if (item.endsWith(".json")) {
            const key = prefix ? `${prefix}/${item.replace(".json", "")}` : item.replace(".json", "");
            try {
              const raw = fs.readFileSync(fullPath, "utf-8");
              const parsed = JSON.parse(raw);
              const age = Date.now() - new Date(parsed._cachedAt).getTime();
              entries.push({
                key,
                cachedAt: parsed._cachedAt,
                ageHours: Math.round(age / (60 * 60 * 1000) * 10) / 10,
                sizeBytes: stat.size
              });
            } catch {
              entries.push({ key, error: "unreadable" });
            }
          }
        }
      }
      
      scanDir(CACHE_BASE);
      
      return {
        content: [{ type: "text", text: JSON.stringify({ cacheDir: CACHE_BASE, entries }) }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error listing cache: ${error.message}` }],
        isError: true
      };
    }
  }
);

// Tool: cache_delete — delete a cache entry
server.tool(
  "cache_delete",
  "Delete a specific cache entry.",
  {
    key: z.string().describe("Cache key to delete")
  },
  async ({ key }) => {
    try {
      const filePath = resolvePath(key);
      
      if (!fs.existsSync(filePath)) {
        return {
          content: [{ type: "text", text: `Cache "${key}" does not exist.` }]
        };
      }
      
      fs.unlinkSync(filePath);
      return {
        content: [{ type: "text", text: `Deleted cache "${key}"` }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error deleting cache "${key}": ${error.message}` }],
        isError: true
      };
    }
  }
);

// Tool: cache_append — append to an array in a cache file (for logged appointments)
server.tool(
  "cache_append",
  "Append an item to an array stored in a cache entry. Creates the array if it doesn't exist. Used for the engagement log.",
  {
    key: z.string().describe("Cache key containing an array, e.g. 'logged'"),
    item: z.string().describe("JSON string of the item to append")
  },
  async ({ key, item }) => {
    try {
      const filePath = resolvePath(key);
      ensureDir(filePath);
      
      let parsed: any;
      try {
        parsed = JSON.parse(item);
      } catch {
        parsed = item;
      }
      
      let existing: any = { _cachedAt: new Date().toISOString(), _key: key, data: [] };
      
      if (fs.existsSync(filePath)) {
        try {
          const raw = fs.readFileSync(filePath, "utf-8");
          existing = JSON.parse(raw);
          if (!Array.isArray(existing.data)) {
            existing.data = [];
          }
        } catch {
          existing.data = [];
        }
      }
      
      existing.data.push(parsed);
      existing._cachedAt = new Date().toISOString();
      
      fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), "utf-8");
      
      return {
        content: [{ type: "text", text: `Appended to "${key}" (${existing.data.length} items total)` }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error appending to cache "${key}": ${error.message}` }],
        isError: true
      };
    }
  }
);

// Tool: cache_lookup — search the local accounts/opportunities lookup cache
server.tool(
  "cache_lookup",
  "Search the local lookup cache for accounts or opportunities. Returns matching entries without hitting the API. Use this BEFORE making webhook calls for lookups.",
  {
    type: z.enum(["accounts", "opportunities"]).describe("Which lookup cache to search"),
    query: z.string().optional().describe("Search string (case-insensitive substring match). Omit to return all entries.")
  },
  async ({ type, query }) => {
    try {
      const filePath = resolvePath(`lookups/${type}`);

      if (!fs.existsSync(filePath)) {
        return {
          content: [{ type: "text", text: JSON.stringify({ exists: false, type, matches: [] }) }]
        };
      }

      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      const data: Record<string, any> = parsed.data || {};

      if (!query) {
        const entries = Object.entries(data).map(([key, val]) => ({ key, ...val as any }));
        return {
          content: [{ type: "text", text: JSON.stringify({ exists: true, type, count: entries.length, matches: entries }) }]
        };
      }

      const q = query.toLowerCase();
      const matches = Object.entries(data)
        .filter(([key]) => key.toLowerCase().includes(q))
        .map(([key, val]) => ({ key, ...val as any }));

      return {
        content: [{ type: "text", text: JSON.stringify({ exists: true, type, query, count: matches.length, matches }) }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error searching lookups "${type}": ${error.message}` }],
        isError: true
      };
    }
  }
);

// Tool: cache_lookup_add — add entries to the local lookup cache (merges, doesn't overwrite)
server.tool(
  "cache_lookup_add",
  "Add one or more entries to the local accounts or opportunities lookup cache. Merges with existing data. Use after any webhook that returns account/opp data.",
  {
    type: z.enum(["accounts", "opportunities"]).describe("Which lookup cache to update"),
    entries: z.string().describe('JSON string of entries to add. For accounts: {"AccountName": {"odataId": "..."}}. For opportunities: {"OPTY1234": {"odataId": "...", "accountName": "...", "status": "..."}}')
  },
  async ({ type, entries }) => {
    try {
      const filePath = resolvePath(`lookups/${type}`);
      ensureDir(filePath);

      let parsed: Record<string, any>;
      try {
        parsed = JSON.parse(entries);
      } catch {
        return {
          content: [{ type: "text", text: `Error: entries must be valid JSON` }],
          isError: true
        };
      }

      // Read existing or start fresh
      let existing: any = { _cachedAt: new Date().toISOString(), _key: `lookups/${type}`, data: {} };
      if (fs.existsSync(filePath)) {
        try {
          const raw = fs.readFileSync(filePath, "utf-8");
          existing = JSON.parse(raw);
          if (typeof existing.data !== "object" || existing.data === null) {
            existing.data = {};
          }
        } catch {
          existing.data = {};
        }
      }

      // Merge new entries (add lastSeen timestamp)
      const now = new Date().toISOString();
      let added = 0;
      for (const [key, val] of Object.entries(parsed)) {
        if (!existing.data[key]) added++;
        existing.data[key] = { ...(existing.data[key] || {}), ...(val as any), lastSeen: now };
      }

      existing._cachedAt = now;
      fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), "utf-8");

      const total = Object.keys(existing.data).length;
      return {
        content: [{ type: "text", text: `Updated ${type} lookups: ${added} new, ${total} total` }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error updating lookups "${type}": ${error.message}` }],
        isError: true
      };
    }
  }
);

// Tool: cache_lookup_remove — remove a specific entry from the lookup cache
server.tool(
  "cache_lookup_remove",
  "Remove a specific entry from the accounts or opportunities lookup cache. Use when user asks to forget/remove a cached lookup.",
  {
    type: z.enum(["accounts", "opportunities"]).describe("Which lookup cache to update"),
    key: z.string().describe("The exact key to remove (account name or OPTY number)")
  },
  async ({ type, key }) => {
    try {
      const filePath = resolvePath(`lookups/${type}`);

      if (!fs.existsSync(filePath)) {
        return {
          content: [{ type: "text", text: `No ${type} lookup cache exists.` }]
        };
      }

      const raw = fs.readFileSync(filePath, "utf-8");
      const existing = JSON.parse(raw);

      if (!existing.data || !existing.data[key]) {
        return {
          content: [{ type: "text", text: `"${key}" not found in ${type} lookups.` }]
        };
      }

      delete existing.data[key];
      existing._cachedAt = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), "utf-8");

      return {
        content: [{ type: "text", text: `Removed "${key}" from ${type} lookups. ${Object.keys(existing.data).length} entries remaining.` }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error removing from lookups "${type}": ${error.message}` }],
        isError: true
      };
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
