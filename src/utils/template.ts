import type { FormFileRow, KvPair } from "../types";

export function applyEnvTemplate(input: string, envs: KvPair[]): string {
  if (!input) return input;
  const map = new Map(envs.filter((e) => e.key.trim()).map((e) => [e.key, e.value]));
  return input.replace(/\{\{([^}]+)\}\}/g, (_, raw) => {
    const key = String(raw ?? "").trim();
    return map.has(key) ? String(map.get(key)) : `{{${key}}}`;
  });
}

export function applyEnvToKvPairs(pairs: KvPair[], envs: KvPair[]): KvPair[] {
  return pairs.map((p) => ({
    key: applyEnvTemplate(p.key, envs),
    value: applyEnvTemplate(p.value, envs),
  }));
}

export function applyEnvToFormFiles(rows: FormFileRow[], envs: KvPair[]): FormFileRow[] {
  return rows.map((r) => ({
    key: applyEnvTemplate(r.key, envs),
    path: applyEnvTemplate(r.path, envs),
  }));
}

