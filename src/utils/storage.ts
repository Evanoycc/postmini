const KEY_TABS = "postmini.tabs.v1";
const KEY_ENVS = "postmini.envs.v1";
const KEY_THEME = "postmini.theme.v1";
const KEY_COLLECTIONS = "postmini.collections.v1";

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const storageKeys = {
  tabs: KEY_TABS,
  envs: KEY_ENVS,
  theme: KEY_THEME,
  collections: KEY_COLLECTIONS,
};

