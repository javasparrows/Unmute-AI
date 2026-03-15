export interface CitationMeta {
  citeKey: string;
  paperId: string;
  title: string;
  authors: { name: string }[];
  year?: number;
  venue?: string;
}

const store = new Map<string, CitationMeta>();

export const citationStore = {
  set(citeKey: string, meta: CitationMeta): void {
    store.set(citeKey, meta);
  },

  get(citeKey: string): CitationMeta | undefined {
    return store.get(citeKey);
  },

  has(citeKey: string): boolean {
    return store.has(citeKey);
  },

  clear(): void {
    store.clear();
  },

  getAll(): Map<string, CitationMeta> {
    return new Map(store);
  },
};
