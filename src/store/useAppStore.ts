import { nanoid } from "nanoid";
import { useEffect, useMemo, useReducer } from "react";
import { getMessages, type Locale } from "../i18n";
import type { EnvGroup, EnvVar, FormFileRow, KvPair, RequestDraft, RequestGroup, ResponseView } from "../types";
import { loadJson, saveJson, storageKeys } from "../utils/storage";

type TabState = {
  tabs: { id: string; title: string; request: RequestDraft; response: ResponseView }[];
  activeTabId: string;
};

type PersistedTabs = {
  tabs: { id: string; title: string; request: RequestDraft }[];
  activeTabId: string;
};

type State = {
  tabState: TabState;
  collections: RequestGroup[];
  envGroups: EnvGroup[];
  activeEnvGroupId: string;
  theme: "light" | "dark";
  locale: Locale;
};

type Action =
  | { type: "tab.new" }
  | { type: "tab.openCollection"; groupId: string; itemId: string }
  | { type: "tab.close"; id: string }
  | { type: "tab.activate"; id: string }
  | { type: "tab.rename"; id: string; title: string }
  | { type: "request.patch"; id: string; patch: Partial<RequestDraft> }
  | { type: "response.set"; id: string; response: ResponseView }
  | { type: "collection.group.add"; parentGroupId?: string | null }
  | { type: "collection.group.rename"; groupId: string; name: string }
  | { type: "collection.group.remove"; groupId: string }
  | { type: "collection.request.add"; groupId: string }
  | { type: "collection.request.rename"; groupId: string; itemId: string; name: string }
  | { type: "collection.request.remove"; groupId: string; itemId: string }
  | { type: "collection.set"; collections: RequestGroup[] }
  | { type: "env.groups.set"; envGroups: EnvGroup[]; activeEnvGroupId?: string }
  | { type: "env.group.activate"; id: string }
  | { type: "theme.set"; theme: "light" | "dark" }
  | { type: "locale.set"; locale: Locale };

const emptyKv = (): KvPair => ({ key: "", value: "" });

function normalizeRequest(r: RequestDraft): RequestDraft {
  const formFiles: FormFileRow[] = r.formFiles && r.formFiles.length ? r.formFiles : [{ key: "", path: "" }];
  return {
    ...r,
    params: r.params && r.params.length ? r.params : [emptyKv()],
    authorizationType: r.authorizationType ?? "none",
    authBearerToken: r.authBearerToken ?? "",
    authBasicUsername: r.authBasicUsername ?? "",
    authBasicPassword: r.authBasicPassword ?? "",
    formFiles,
    saveResponseTo: r.saveResponseTo ?? "",
    collectionGroupId: r.collectionGroupId ?? null,
    collectionItemId: r.collectionItemId ?? null,
  };
}

function newDraft(locale: Locale): RequestDraft {
  const m = getMessages(locale);
  return {
    id: nanoid(),
    name: m.defaultNewRequestName,
    collectionGroupId: null,
    collectionItemId: null,
    url: "",
    method: "GET",
    headers: [emptyKv()],
    params: [emptyKv()],
    authorizationType: "none",
    authBearerToken: "",
    authBasicUsername: "",
    authBasicPassword: "",
    bodyType: "none",
    bodyText: "",
    formData: [emptyKv()],
    formFiles: [{ key: "file", path: "" }],
    saveResponseTo: "",
  };
}

function cloneDraft(locale: Locale, input?: Partial<RequestDraft>): RequestDraft {
  const base = newDraft(locale);
  return normalizeRequest({
    ...base,
    ...input,
    id: input?.id ?? base.id,
    headers: input?.headers ? input.headers.map((kv) => ({ ...kv })) : base.headers,
    params: input?.params ? input.params.map((kv) => ({ ...kv })) : base.params,
    formData: input?.formData ? input.formData.map((kv) => ({ ...kv })) : base.formData,
    formFiles: input?.formFiles ? input.formFiles.map((row) => ({ ...row })) : base.formFiles,
  });
}

function normalizeCollection(group: RequestGroup, locale: Locale): RequestGroup {
  const m = getMessages(locale);
  return {
    id: group.id,
    name: group.name || m.unnamedGroup,
    items: (group.items ?? []).map((item) => ({
      id: item.id,
      name: item.name || item.request?.name || m.unnamedRequest,
      request: cloneDraft(locale, {
        ...item.request,
        id: item.id,
        name: item.name || item.request?.name || m.unnamedRequest,
        collectionGroupId: group.id,
        collectionItemId: item.id,
      }),
    })),
    childGroups: (group.childGroups ?? []).map((child) => normalizeCollection(child, locale)),
  };
}

function defaultCollections(locale: Locale): RequestGroup[] {
  const m = getMessages(locale);
  const groupId = nanoid();
  const itemId = nanoid();
  const request = cloneDraft(locale, {
    id: itemId,
    name: m.sampleRequest,
    collectionGroupId: groupId,
    collectionItemId: itemId,
  });
  return [{ id: groupId, name: m.defaultGroup, items: [{ id: itemId, name: request.name, request }], childGroups: [] }];
}

function sanitizeGroup(group: RequestGroup, seenGroupIds: Set<string>, locale: Locale): RequestGroup {
  const m = getMessages(locale);
  const groupId = group.id && !seenGroupIds.has(group.id) ? group.id : nanoid();
  seenGroupIds.add(groupId);
  const seenItemIds = new Set<string>();

  const items = (group.items ?? [])
    .filter((item) => item && item.request && typeof item.request.url === "string")
    .map((item) => {
      const itemId = item.id && !seenItemIds.has(item.id) ? item.id : nanoid();
      seenItemIds.add(itemId);
      const name = item.name || item.request.name || m.unnamedRequest;
      const request = cloneDraft(locale, {
        ...item.request,
        id: itemId,
        name,
        collectionGroupId: groupId,
        collectionItemId: itemId,
      });
      return { id: itemId, name, request };
    });

  return normalizeCollection(
    { id: groupId, name: group.name, items, childGroups: (group.childGroups ?? []).map((child) => sanitizeGroup(child, seenGroupIds, locale)) },
    locale,
  );
}

function sanitizeCollections(input: RequestGroup[], locale: Locale): RequestGroup[] {
  const seenGroupIds = new Set<string>();
  return input.filter((group) => group && typeof group.name === "string").map((group) => sanitizeGroup(group, seenGroupIds, locale));
}

function defaultEnvGroups(locale: Locale): EnvGroup[] {
  const m = getMessages(locale);
  return [
    { id: nanoid(), name: m.envGroupDefault, vars: [{ key: "base_url", value: "" }] },
    { id: nanoid(), name: m.envGroupProd, vars: [{ key: "base_url", value: "" }] },
  ];
}

function sanitizeEnvGroups(input: unknown, locale: Locale): EnvGroup[] {
  const fallback = defaultEnvGroups(locale);

  if (!Array.isArray(input)) return fallback;

  const seen = new Set<string>();
  const groups = input
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const raw = entry as Partial<EnvGroup> & { key?: string; value?: string };

      // compatibility with old flat env array
      if ("key" in raw && "value" in raw && typeof raw.key === "string") {
        return null;
      }

      const id = raw.id && !seen.has(raw.id) ? raw.id : nanoid();
      seen.add(id);
      const vars = Array.isArray(raw.vars)
        ? raw.vars.filter((item): item is EnvVar => Boolean(item && typeof item.key === "string" && typeof item.value === "string"))
        : [];
      return {
        id,
        name: typeof raw.name === "string" && raw.name.trim() ? raw.name : getMessages(locale).envNewGroup,
        vars: vars.length ? vars : [{ key: "base_url", value: "" }],
      };
    })
    .filter(Boolean) as EnvGroup[];

  if (groups.length) return groups;

  const oldFlatVars = input.filter((item): item is EnvVar => Boolean(item && typeof item === "object" && "key" in item && "value" in item));
  if (oldFlatVars.length) {
    return [{ id: nanoid(), name: getMessages(locale).envGroupDefault, vars: oldFlatVars }];
  }

  return fallback;
}

function findCollectionItem(groups: RequestGroup[], groupId: string, itemId: string): { id: string; name: string; request: RequestDraft } | null {
  for (const group of groups) {
    if (group.id === groupId) {
      const item = group.items.find((x) => x.id === itemId);
      if (item) return item;
    }
    const nested = findCollectionItem(group.childGroups, groupId, itemId);
    if (nested) return nested;
  }
  return null;
}

function mapGroups(groups: RequestGroup[], targetGroupId: string, mapper: (group: RequestGroup) => RequestGroup): RequestGroup[] {
  return groups.map((group) => {
    if (group.id === targetGroupId) return mapper(group);
    return { ...group, childGroups: mapGroups(group.childGroups, targetGroupId, mapper) };
  });
}

function removeGroupFromTree(groups: RequestGroup[], groupId: string): RequestGroup[] {
  return groups.filter((group) => group.id !== groupId).map((group) => ({ ...group, childGroups: removeGroupFromTree(group.childGroups, groupId) }));
}

function collectGroupIds(group: RequestGroup): string[] {
  return [group.id, ...group.childGroups.flatMap(collectGroupIds)];
}

function findGroupById(groups: RequestGroup[], groupId: string): RequestGroup | null {
  for (const group of groups) {
    if (group.id === groupId) return group;
    const nested = findGroupById(group.childGroups, groupId);
    if (nested) return nested;
  }
  return null;
}

function initialState(): State {
  const locale = loadJson<Locale>(storageKeys.locale, "zh-CN");
  const persistedTabs = loadJson<PersistedTabs | null>(storageKeys.tabs, null);
  const collections = sanitizeCollections(loadJson<RequestGroup[]>(storageKeys.collections, defaultCollections(locale)), locale);
  const rawEnvs = loadJson<unknown>(storageKeys.envs, defaultEnvGroups(locale));
  const envGroups = sanitizeEnvGroups(rawEnvs, locale);
  const theme = loadJson<"light" | "dark">(storageKeys.theme, "light");
  const activeEnvGroupId = loadJson<string>(`${storageKeys.envs}.active`, envGroups[0]?.id ?? "");
  const resolvedActiveEnvGroupId = envGroups.some((group) => group.id === activeEnvGroupId) ? activeEnvGroupId : envGroups[0]!.id;

  if (persistedTabs?.tabs?.length) {
    const tabs = persistedTabs.tabs.map((t) => ({ id: t.id, title: t.title, request: normalizeRequest(t.request as RequestDraft), response: {} }));
    const activeTabId = tabs.some((t) => t.id === persistedTabs.activeTabId) ? persistedTabs.activeTabId : tabs[0]!.id;
    return { tabState: { tabs, activeTabId }, collections, envGroups, activeEnvGroupId: resolvedActiveEnvGroupId, theme, locale };
  }

  const m = getMessages(locale);
  const first = { id: nanoid(), title: m.defaultTab, request: newDraft(locale), response: {} };
  return { tabState: { tabs: [first], activeTabId: first.id }, collections, envGroups, activeEnvGroupId: resolvedActiveEnvGroupId, theme, locale };
}

function reducer(state: State, action: Action): State {
  const m = getMessages(state.locale);

  switch (action.type) {
    case "tab.new": {
      const next = { id: nanoid(), title: `${m.tabPrefix} ${state.tabState.tabs.length + 1}`, request: newDraft(state.locale), response: {} };
      return { ...state, tabState: { tabs: [...state.tabState.tabs, next], activeTabId: next.id } };
    }
    case "tab.openCollection": {
      const existing = state.tabState.tabs.find((tab) => tab.request.collectionGroupId === action.groupId && tab.request.collectionItemId === action.itemId);
      if (existing) return { ...state, tabState: { ...state.tabState, activeTabId: existing.id } };
      const item = findCollectionItem(state.collections, action.groupId, action.itemId);
      if (!item) return state;
      const next = { id: nanoid(), title: item.name || `${m.tabPrefix} ${state.tabState.tabs.length + 1}`, request: cloneDraft(state.locale, item.request), response: {} };
      return { ...state, tabState: { tabs: [...state.tabState.tabs, next], activeTabId: next.id } };
    }
    case "tab.close": {
      const tabs = state.tabState.tabs.filter((t) => t.id !== action.id);
      const kept = tabs.length ? tabs : [{ id: nanoid(), title: m.defaultTab, request: newDraft(state.locale), response: {} }];
      const activeTabId = state.tabState.activeTabId === action.id ? kept[0]!.id : state.tabState.activeTabId;
      return { ...state, tabState: { tabs: kept, activeTabId } };
    }
    case "tab.activate":
      return { ...state, tabState: { ...state.tabState, activeTabId: action.id } };
    case "tab.rename":
      return { ...state, tabState: { ...state.tabState, tabs: state.tabState.tabs.map((t) => (t.id === action.id ? { ...t, title: action.title } : t)) } };
    case "request.patch": {
      const tabs = state.tabState.tabs.map((t) => (t.id === action.id ? { ...t, request: normalizeRequest({ ...t.request, ...action.patch }), title: action.patch.name ?? t.title } : t));
      const patchedTab = tabs.find((t) => t.id === action.id);
      if (!patchedTab?.request.collectionGroupId || !patchedTab.request.collectionItemId) return { ...state, tabState: { ...state.tabState, tabs } };
      const collections = mapGroups(state.collections, patchedTab.request.collectionGroupId, (group) => ({
        ...group,
        items: group.items.map((item) => item.id === patchedTab.request.collectionItemId ? { ...item, name: patchedTab.request.name, request: cloneDraft(state.locale, patchedTab.request) } : item),
      }));
      return { ...state, tabState: { ...state.tabState, tabs }, collections };
    }
    case "response.set":
      return { ...state, tabState: { ...state.tabState, tabs: state.tabState.tabs.map((t) => (t.id === action.id ? { ...t, response: action.response } : t)) } };
    case "collection.group.add": {
      const next: RequestGroup = { id: nanoid(), name: action.parentGroupId ? m.newChildGroupDefault : `${m.groupPrefix} ${state.collections.length + 1}`, items: [], childGroups: [] };
      if (!action.parentGroupId) return { ...state, collections: [...state.collections, next] };
      return { ...state, collections: mapGroups(state.collections, action.parentGroupId, (group) => ({ ...group, childGroups: [...group.childGroups, next] })) };
    }
    case "collection.group.rename":
      return { ...state, collections: mapGroups(state.collections, action.groupId, (group) => ({ ...group, name: action.name })) };
    case "collection.group.remove": {
      const target = findGroupById(state.collections, action.groupId);
      const removedGroupIds = target ? collectGroupIds(target) : [action.groupId];
      const collections = removeGroupFromTree(state.collections, action.groupId);
      const tabs = state.tabState.tabs.filter((tab) => !removedGroupIds.includes(tab.request.collectionGroupId ?? "__none__"));
      const keptTabs = tabs.length ? tabs : [{ id: nanoid(), title: m.defaultTab, request: newDraft(state.locale), response: {} }];
      const activeTabId = keptTabs.some((tab) => tab.id === state.tabState.activeTabId) ? state.tabState.activeTabId : keptTabs[0]!.id;
      return { ...state, collections, tabState: { tabs: keptTabs, activeTabId } };
    }
    case "collection.request.add": {
      const itemId = nanoid();
      const request = cloneDraft(state.locale, { id: itemId, name: m.unnamedRequest, collectionGroupId: action.groupId, collectionItemId: itemId });
      const collections = mapGroups(state.collections, action.groupId, (group) => ({ ...group, items: [...group.items, { id: itemId, name: request.name, request }] }));
      const existingTabIndex = state.tabState.tabs.findIndex((tab) => tab.id === state.tabState.activeTabId);
      const tabs = [...state.tabState.tabs];
      if (existingTabIndex >= 0) tabs[existingTabIndex] = { ...tabs[existingTabIndex], title: request.name, request, response: {} };
      return { ...state, collections, tabState: { ...state.tabState, tabs } };
    }
    case "collection.request.rename": {
      const collections = mapGroups(state.collections, action.groupId, (group) => ({
        ...group,
        items: group.items.map((item) => item.id === action.itemId ? { ...item, name: action.name, request: { ...item.request, name: action.name } } : item),
      }));
      const tabs = state.tabState.tabs.map((tab) => tab.request.collectionGroupId === action.groupId && tab.request.collectionItemId === action.itemId ? { ...tab, title: action.name || tab.title, request: { ...tab.request, name: action.name } } : tab);
      return { ...state, collections, tabState: { ...state.tabState, tabs } };
    }
    case "collection.request.remove": {
      const collections = mapGroups(state.collections, action.groupId, (group) => ({ ...group, items: group.items.filter((item) => item.id !== action.itemId) }));
      const tabs = state.tabState.tabs.filter((tab) => !(tab.request.collectionGroupId === action.groupId && tab.request.collectionItemId === action.itemId));
      const keptTabs = tabs.length ? tabs : [{ id: nanoid(), title: m.defaultTab, request: newDraft(state.locale), response: {} }];
      const activeTabId = keptTabs.some((tab) => tab.id === state.tabState.activeTabId) ? state.tabState.activeTabId : keptTabs[0]!.id;
      return { ...state, collections, tabState: { tabs: keptTabs, activeTabId } };
    }
    case "collection.set":
      return { ...state, collections: sanitizeCollections(action.collections, state.locale) };
    case "env.groups.set": {
      const envGroups = sanitizeEnvGroups(action.envGroups, state.locale);
      const activeEnvGroupId = action.activeEnvGroupId && envGroups.some((group) => group.id === action.activeEnvGroupId) ? action.activeEnvGroupId : envGroups[0]!.id;
      return { ...state, envGroups, activeEnvGroupId };
    }
    case "env.group.activate":
      return state.envGroups.some((group) => group.id === action.id) ? { ...state, activeEnvGroupId: action.id } : state;
    case "theme.set":
      return { ...state, theme: action.theme };
    case "locale.set":
      return { ...state, locale: action.locale };
    default:
      return state;
  }
}

export function useAppStore() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  const activeTab = useMemo(() => state.tabState.tabs.find((t) => t.id === state.tabState.activeTabId) ?? state.tabState.tabs[0]!, [state.tabState.activeTabId, state.tabState.tabs]);
  const activeEnvGroup = useMemo(() => state.envGroups.find((group) => group.id === state.activeEnvGroupId) ?? state.envGroups[0]!, [state.envGroups, state.activeEnvGroupId]);

  useEffect(() => {
    const persisted: PersistedTabs = { tabs: state.tabState.tabs.map((t) => ({ id: t.id, title: t.title, request: t.request })), activeTabId: state.tabState.activeTabId };
    saveJson(storageKeys.tabs, persisted);
  }, [state.tabState]);

  useEffect(() => {
    saveJson(storageKeys.collections, state.collections);
  }, [state.collections]);

  useEffect(() => {
    saveJson(storageKeys.envs, state.envGroups);
    saveJson(`${storageKeys.envs}.active`, state.activeEnvGroupId);
  }, [state.envGroups, state.activeEnvGroupId]);

  useEffect(() => {
    saveJson(storageKeys.theme, state.theme);
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  useEffect(() => {
    saveJson(storageKeys.locale, state.locale);
    document.documentElement.lang = state.locale;
  }, [state.locale]);

  return { state, dispatch, activeTab, activeEnvGroup };
}
