import { nanoid } from "nanoid";
import { useEffect, useMemo, useReducer } from "react";
import type { EnvVar, FormFileRow, KvPair, RequestDraft, RequestGroup, ResponseView } from "../types";
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
  envs: EnvVar[];
  theme: "light" | "dark";
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
  | { type: "envs.set"; envs: EnvVar[] }
  | { type: "theme.set"; theme: "light" | "dark" };

const emptyKv = (): KvPair => ({ key: "", value: "" });

function normalizeRequest(r: RequestDraft): RequestDraft {
  const formFiles: FormFileRow[] = r.formFiles && r.formFiles.length ? r.formFiles : [{ key: "", path: "" }];
  return {
    ...r,
    formFiles,
    saveResponseTo: r.saveResponseTo ?? "",
    collectionGroupId: r.collectionGroupId ?? null,
    collectionItemId: r.collectionItemId ?? null,
  };
}

function newDraft(): RequestDraft {
  return {
    id: nanoid(),
    name: "新接口",
    collectionGroupId: null,
    collectionItemId: null,
    url: "",
    method: "GET",
    headers: [emptyKv()],
    bodyType: "none",
    bodyText: "",
    formData: [emptyKv()],
    formFiles: [{ key: "file", path: "" }],
    saveResponseTo: "",
  };
}

function cloneDraft(input?: Partial<RequestDraft>): RequestDraft {
  const base = newDraft();
  return normalizeRequest({
    ...base,
    ...input,
    id: input?.id ?? base.id,
    headers: input?.headers ? input.headers.map((kv) => ({ ...kv })) : base.headers,
    formData: input?.formData ? input.formData.map((kv) => ({ ...kv })) : base.formData,
    formFiles: input?.formFiles ? input.formFiles.map((row) => ({ ...row })) : base.formFiles,
  });
}

function normalizeCollection(group: RequestGroup): RequestGroup {
  return {
    id: group.id,
    name: group.name || "未命名分组",
    items: (group.items ?? []).map((item) => ({
      id: item.id,
      name: item.name || item.request?.name || "未命名接口",
      request: cloneDraft({
        ...item.request,
        id: item.id,
        name: item.name || item.request?.name || "未命名接口",
        collectionGroupId: group.id,
        collectionItemId: item.id,
      }),
    })),
    childGroups: (group.childGroups ?? []).map(normalizeCollection),
  };
}

function defaultCollections(): RequestGroup[] {
  const groupId = nanoid();
  const itemId = nanoid();
  const request = cloneDraft({
    id: itemId,
    name: "示例接口",
    collectionGroupId: groupId,
    collectionItemId: itemId,
  });
  return [
    {
      id: groupId,
      name: "默认分组",
      items: [{ id: itemId, name: request.name, request }],
      childGroups: [],
    },
  ];
}

function sanitizeGroup(group: RequestGroup, seenGroupIds: Set<string>): RequestGroup {
  const groupId = group.id && !seenGroupIds.has(group.id) ? group.id : nanoid();
  seenGroupIds.add(groupId);
  const seenItemIds = new Set<string>();

  const items = (group.items ?? [])
    .filter((item) => item && item.request && typeof item.request.url === "string")
    .map((item) => {
      const itemId = item.id && !seenItemIds.has(item.id) ? item.id : nanoid();
      seenItemIds.add(itemId);
      const name = item.name || item.request.name || "未命名接口";
      const request = cloneDraft({
        ...item.request,
        id: itemId,
        name,
        collectionGroupId: groupId,
        collectionItemId: itemId,
      });
      return { id: itemId, name, request };
    });

  return normalizeCollection({
    id: groupId,
    name: group.name,
    items,
    childGroups: (group.childGroups ?? []).map((child) => sanitizeGroup(child, seenGroupIds)),
  });
}

function sanitizeCollections(input: RequestGroup[]): RequestGroup[] {
  const seenGroupIds = new Set<string>();
  return input
    .filter((group) => group && typeof group.name === "string")
    .map((group) => sanitizeGroup(group, seenGroupIds));
}

function findCollectionItem(
  groups: RequestGroup[],
  groupId: string,
  itemId: string,
): { id: string; name: string; request: RequestDraft } | null {
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
  return groups
    .filter((group) => group.id !== groupId)
    .map((group) => ({ ...group, childGroups: removeGroupFromTree(group.childGroups, groupId) }));
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
  const persistedTabs = loadJson<PersistedTabs | null>(storageKeys.tabs, null);
  const collections = sanitizeCollections(loadJson<RequestGroup[]>(storageKeys.collections, defaultCollections()));
  const envs = loadJson<EnvVar[]>(storageKeys.envs, [{ key: "base_url", value: "" }]);
  const theme = loadJson<"light" | "dark">(storageKeys.theme, "light");

  if (persistedTabs?.tabs?.length) {
    const tabs = persistedTabs.tabs.map((t) => ({
      id: t.id,
      title: t.title,
      request: normalizeRequest(t.request as RequestDraft),
      response: {},
    }));
    const activeTabId =
      tabs.some((t) => t.id === persistedTabs.activeTabId) ? persistedTabs.activeTabId : tabs[0]!.id;
    return { tabState: { tabs, activeTabId }, collections, envs, theme };
  }

  const first = { id: nanoid(), title: "Tab 1", request: newDraft(), response: {} };
  return { tabState: { tabs: [first], activeTabId: first.id }, collections, envs, theme };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "tab.new": {
      const next = { id: nanoid(), title: `Tab ${state.tabState.tabs.length + 1}`, request: newDraft(), response: {} };
      return {
        ...state,
        tabState: { tabs: [...state.tabState.tabs, next], activeTabId: next.id },
      };
    }
    case "tab.openCollection": {
      const existing = state.tabState.tabs.find(
        (tab) => tab.request.collectionGroupId === action.groupId && tab.request.collectionItemId === action.itemId,
      );
      if (existing) return { ...state, tabState: { ...state.tabState, activeTabId: existing.id } };
      const item = findCollectionItem(state.collections, action.groupId, action.itemId);
      if (!item) return state;
      const next = {
        id: nanoid(),
        title: item.name || `Tab ${state.tabState.tabs.length + 1}`,
        request: cloneDraft(item.request),
        response: {},
      };
      return { ...state, tabState: { tabs: [...state.tabState.tabs, next], activeTabId: next.id } };
    }
    case "tab.close": {
      const tabs = state.tabState.tabs.filter((t) => t.id !== action.id);
      const kept = tabs.length ? tabs : [{ id: nanoid(), title: "Tab 1", request: newDraft(), response: {} }];
      const activeTabId = state.tabState.activeTabId === action.id ? kept[0]!.id : state.tabState.activeTabId;
      return { ...state, tabState: { tabs: kept, activeTabId } };
    }
    case "tab.activate":
      return { ...state, tabState: { ...state.tabState, activeTabId: action.id } };
    case "tab.rename":
      return {
        ...state,
        tabState: {
          ...state.tabState,
          tabs: state.tabState.tabs.map((t) => (t.id === action.id ? { ...t, title: action.title } : t)),
        },
      };
    case "request.patch": {
      const tabs = state.tabState.tabs.map((t) =>
        t.id === action.id
          ? { ...t, request: normalizeRequest({ ...t.request, ...action.patch }), title: action.patch.name ?? t.title }
          : t,
      );
      const patchedTab = tabs.find((t) => t.id === action.id);
      if (!patchedTab?.request.collectionGroupId || !patchedTab.request.collectionItemId) {
        return { ...state, tabState: { ...state.tabState, tabs } };
      }
      const collections = mapGroups(state.collections, patchedTab.request.collectionGroupId, (group) => ({
        ...group,
        items: group.items.map((item) =>
          item.id === patchedTab.request.collectionItemId
            ? { ...item, name: patchedTab.request.name, request: cloneDraft(patchedTab.request) }
            : item,
        ),
      }));
      return { ...state, tabState: { ...state.tabState, tabs }, collections };
    }
    case "response.set":
      return {
        ...state,
        tabState: {
          ...state.tabState,
          tabs: state.tabState.tabs.map((t) => (t.id === action.id ? { ...t, response: action.response } : t)),
        },
      };
    case "collection.group.add": {
      const next: RequestGroup = {
        id: nanoid(),
        name: action.parentGroupId ? "新子分组" : `分组 ${state.collections.length + 1}`,
        items: [],
        childGroups: [],
      };
      if (!action.parentGroupId) return { ...state, collections: [...state.collections, next] };
      return {
        ...state,
        collections: mapGroups(state.collections, action.parentGroupId, (group) => ({
          ...group,
          childGroups: [...group.childGroups, next],
        })),
      };
    }
    case "collection.group.rename":
      return {
        ...state,
        collections: mapGroups(state.collections, action.groupId, (group) => ({ ...group, name: action.name })),
      };
    case "collection.group.remove": {
      const target = findGroupById(state.collections, action.groupId);
      const removedGroupIds = target ? collectGroupIds(target) : [action.groupId];
      const collections = removeGroupFromTree(state.collections, action.groupId);
      const tabs = state.tabState.tabs.filter(
        (tab) => !removedGroupIds.includes(tab.request.collectionGroupId ?? "__none__"),
      );
      const keptTabs = tabs.length ? tabs : [{ id: nanoid(), title: "Tab 1", request: newDraft(), response: {} }];
      const activeTabStillExists = keptTabs.some((tab) => tab.id === state.tabState.activeTabId);
      const activeTabId = activeTabStillExists ? state.tabState.activeTabId : keptTabs[0]!.id;
      return { ...state, collections, tabState: { tabs: keptTabs, activeTabId } };
    }
    case "collection.request.add": {
      const itemId = nanoid();
      const request = cloneDraft({
        id: itemId,
        name: "未命名接口",
        collectionGroupId: action.groupId,
        collectionItemId: itemId,
      });
      const collections = mapGroups(state.collections, action.groupId, (group) => ({
        ...group,
        items: [...group.items, { id: itemId, name: request.name, request }],
      }));
      const existingTabIndex = state.tabState.tabs.findIndex((tab) => tab.id === state.tabState.activeTabId);
      const tabs = [...state.tabState.tabs];
      if (existingTabIndex >= 0) {
        tabs[existingTabIndex] = { ...tabs[existingTabIndex], title: request.name, request, response: {} };
      }
      return { ...state, collections, tabState: { ...state.tabState, tabs } };
    }
    case "collection.request.rename": {
      const collections = mapGroups(state.collections, action.groupId, (group) => ({
        ...group,
        items: group.items.map((item) =>
          item.id === action.itemId ? { ...item, name: action.name, request: { ...item.request, name: action.name } } : item,
        ),
      }));
      const tabs = state.tabState.tabs.map((tab) =>
        tab.request.collectionGroupId === action.groupId && tab.request.collectionItemId === action.itemId
          ? { ...tab, title: action.name || tab.title, request: { ...tab.request, name: action.name } }
          : tab,
      );
      return { ...state, collections, tabState: { ...state.tabState, tabs } };
    }
    case "collection.request.remove": {
      const collections = mapGroups(state.collections, action.groupId, (group) => ({
        ...group,
        items: group.items.filter((item) => item.id !== action.itemId),
      }));
      const tabs = state.tabState.tabs.filter(
        (tab) => !(tab.request.collectionGroupId === action.groupId && tab.request.collectionItemId === action.itemId),
      );
      const keptTabs = tabs.length ? tabs : [{ id: nanoid(), title: "Tab 1", request: newDraft(), response: {} }];
      const activeTabStillExists = keptTabs.some((tab) => tab.id === state.tabState.activeTabId);
      const activeTabId = activeTabStillExists ? state.tabState.activeTabId : keptTabs[0]!.id;
      return { ...state, collections, tabState: { tabs: keptTabs, activeTabId } };
    }
    case "collection.set":
      return { ...state, collections: sanitizeCollections(action.collections) };
    case "envs.set":
      return { ...state, envs: action.envs };
    case "theme.set":
      return { ...state, theme: action.theme };
    default:
      return state;
  }
}

export function useAppStore() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  const activeTab = useMemo(() => {
    return state.tabState.tabs.find((t) => t.id === state.tabState.activeTabId) ?? state.tabState.tabs[0]!;
  }, [state.tabState.activeTabId, state.tabState.tabs]);

  useEffect(() => {
    const persisted: PersistedTabs = {
      tabs: state.tabState.tabs.map((t) => ({ id: t.id, title: t.title, request: t.request })),
      activeTabId: state.tabState.activeTabId,
    };
    saveJson(storageKeys.tabs, persisted);
  }, [state.tabState]);

  useEffect(() => {
    saveJson(storageKeys.collections, state.collections);
  }, [state.collections]);

  useEffect(() => {
    saveJson(storageKeys.envs, state.envs);
  }, [state.envs]);

  useEffect(() => {
    saveJson(storageKeys.theme, state.theme);
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  return { state, dispatch, activeTab };
}
