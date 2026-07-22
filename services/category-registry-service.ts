import AsyncStorage from "@react-native-async-storage/async-storage";
import { BUILT_IN_CATEGORIES } from "@/features/generator/data/built-in-categories";
import type { CategorySchema, CategoryRegion, CategorySearchResult } from "@/shared/validators/CategorySchema";
import { db } from "@/lib/db/client";

const CACHE_KEY = "qrg_category_registry_v1";
const CACHE_TTL = 12 * 60 * 60 * 1000;

function logWarn(ctx: string, e: unknown) {
  if (__DEV__) console.warn(`[category-registry] ${ctx}`, e);
}

async function readCache(): Promise<CategorySchema[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw) as { ts: number; data: CategorySchema[] };
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

async function writeCache(data: CategorySchema[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

async function fetchFirestoreCategories(): Promise<CategorySchema[]> {
  try {
    const { docs } = await db.query(["categories"], {
      where: [{ field: "status", op: "==", value: "active" }],
      limit: 200,
    });
    return docs.map(d => ({
      id: d.id,
      name: d.data.name || "",
      description: d.data.description || "",
      icon: d.data.icon || "qr-code-outline",
      region: (d.data.region as CategoryRegion) || "global",
      tags: Array.isArray(d.data.tags) ? d.data.tags : [],
      popularity: d.data.popularity ?? 0,
      fields: Array.isArray(d.data.fields) ? d.data.fields : [],
      output: d.data.output || {},
      security: d.data.security || {},
      tier: d.data.tier || "free",
      isBuiltIn: false,
      status: "active",
      isIndiaFirst: !!d.data.isIndiaFirst,
      badge: d.data.badge,
      badgeColor: d.data.badgeColor,
    } as CategorySchema));
  } catch (e) {
    logWarn("fetchFirestoreCategories", e);
    return [];
  }
}

function fuzzyScore(category: CategorySchema, query: string): { score: number; matchedOn: string[] } {
  const q = query.toLowerCase().trim();
  if (!q) return { score: 0, matchedOn: [] };

  const words = q.split(/\s+/).filter(Boolean);
  let score = 0;
  const matchedOn: string[] = [];

  const name = category.name.toLowerCase();
  const desc = category.description.toLowerCase();
  const tags = category.tags.map(t => t.toLowerCase());

  for (const word of words) {
    if (name === word) { score += 100; matchedOn.push("exact-name"); continue; }
    if (name.startsWith(word)) { score += 60; matchedOn.push("name-prefix"); continue; }
    if (name.includes(word)) { score += 40; if (!matchedOn.includes("name")) matchedOn.push("name"); continue; }
    if (tags.some(t => t === word)) { score += 35; if (!matchedOn.includes("tag")) matchedOn.push("tag"); continue; }
    if (tags.some(t => t.includes(word))) { score += 20; if (!matchedOn.includes("tag")) matchedOn.push("tag"); continue; }
    if (desc.includes(word)) { score += 10; if (!matchedOn.includes("description")) matchedOn.push("description"); }
  }

  if (score > 0) score += Math.min(category.popularity / 10, 8);
  return { score, matchedOn };
}

export class CategoryRegistryService {
  private static _all: CategorySchema[] | null = null;

  static async getAll(forceRefresh = false): Promise<CategorySchema[]> {
    if (this._all && !forceRefresh) return this._all;

    if (!forceRefresh) {
      const cached = await readCache();
      if (cached) {
        const builtInIds = new Set(BUILT_IN_CATEGORIES.map(c => c.id));
        const dynamic = cached.filter(c => !builtInIds.has(c.id));
        this._all = [...BUILT_IN_CATEGORIES, ...dynamic];
        return this._all;
      }
    }

    const dynamic = await fetchFirestoreCategories();
    const builtInIds = new Set(BUILT_IN_CATEGORIES.map(c => c.id));
    const uniqueDynamic = dynamic.filter(c => !builtInIds.has(c.id));

    this._all = [...BUILT_IN_CATEGORIES, ...uniqueDynamic];
    await writeCache(this._all);
    return this._all;
  }

  static async search(query: string, region?: CategoryRegion): Promise<CategorySearchResult[]> {
    const all = await this.getAll();
    const q = query.trim();

    if (!q) {
      let filtered = region ? all.filter(c => c.region === region || c.region === "global") : all;
      return filtered
        .sort((a, b) => b.popularity - a.popularity)
        .map(c => ({ category: c, score: c.popularity, matchedOn: [] }));
    }

    const results: CategorySearchResult[] = [];
    for (const cat of all) {
      if (region && cat.region !== "global" && cat.region !== region) continue;
      const { score, matchedOn } = fuzzyScore(cat, q);
      if (score > 0) results.push({ category: cat, score, matchedOn });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  static async getByTag(tag: string, region?: CategoryRegion): Promise<CategorySchema[]> {
    const all = await this.getAll();
    return all
      .filter(c => {
        const matchesRegion = !region || c.region === "global" || c.region === region;
        const matchesTag = c.tags.includes(tag.toLowerCase()) ||
          c.id.includes(tag) ||
          c.name.toLowerCase().includes(tag.toLowerCase());
        return matchesTag && matchesRegion;
      })
      .sort((a, b) => b.popularity - a.popularity);
  }

  static async getIndiaFirst(): Promise<CategorySchema[]> {
    const all = await this.getAll();
    return all
      .filter(c => c.isIndiaFirst || c.region === "india")
      .sort((a, b) => b.popularity - a.popularity);
  }

  static async getPopular(limit = 10, region?: CategoryRegion): Promise<CategorySchema[]> {
    const all = await this.getAll();
    let filtered = region
      ? all.filter(c => c.region === "global" || c.region === region)
      : all;
    return filtered
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
  }

  static async getById(id: string): Promise<CategorySchema | null> {
    const all = await this.getAll();
    return all.find(c => c.id === id) ?? null;
  }

  static async getByPresetIdx(idx: number): Promise<CategorySchema | null> {
    const all = await this.getAll();
    return all.find(c => c.presetIdx === idx) ?? null;
  }

  static async registerCustom(
    userId: string,
    schema: Omit<CategorySchema, "id" | "isBuiltIn" | "status">
  ): Promise<string> {
    const docRef = await db.add(["categories"], {
      ...schema,
      createdBy: userId,
      isBuiltIn: false,
      status: "pending",
      createdAt: db.timestamp(),
      updatedAt: db.timestamp(),
    });
    this._all = null;
    return docRef.id;
  }

  static invalidateCache() {
    this._all = null;
    AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
  }
}
