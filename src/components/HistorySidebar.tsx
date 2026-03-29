import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import { confirm } from "@tauri-apps/plugin-dialog";
import { getMessages, type Locale } from "../i18n";
import type { RequestGroup } from "../types";

type ContextMenuState =
  | { x: number; y: number; type: "root" }
  | { x: number; y: number; type: "group"; groupId: string; groupName: string }
  | { x: number; y: number; type: "request"; groupId: string; itemId: string; itemName: string };

type EditingState =
  | { type: "group"; groupId: string; value: string }
  | { type: "request"; groupId: string; itemId: string; value: string }
  | null;

export function HistorySidebar(props: {
  locale: Locale;
  collections: RequestGroup[];
  activeCollectionItemId: string | null;
  onAddGroup: (parentGroupId?: string | null) => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onRemoveGroup: (groupId: string) => void;
  onAddRequest: (groupId: string) => void;
  onRenameRequest: (groupId: string, itemId: string, name: string) => void;
  onRemoveRequest: (groupId: string, itemId: string) => void;
  onOpenRequest: (groupId: string, itemId: string) => void;
  onExportCollections: () => void;
  onImportCollections: (groups: RequestGroup[]) => void;
}) {
  const m = getMessages(props.locale);
  const [q, setQ] = useState("");
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editing, setEditing] = useState<EditingState>(null);
  const collectionFileRef = useRef<HTMLInputElement | null>(null);
  const treeRef = useRef<HTMLDivElement | null>(null);

  const groups = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return props.collections;

    const filterGroup = (group: RequestGroup): RequestGroup | null => {
      const childGroups = group.childGroups.map(filterGroup).filter(Boolean) as RequestGroup[];
      const items = group.items.filter((item) => {
        const name = item.name.toLowerCase();
        const url = item.request.url.toLowerCase();
        const method = item.request.method.toLowerCase();
        return name.includes(qq) || url.includes(qq) || method.includes(qq);
      });

      if (group.name.toLowerCase().includes(qq) || items.length > 0 || childGroups.length > 0) {
        return { ...group, items, childGroups };
      }

      return null;
    };

    return props.collections.map(filterGroup).filter(Boolean) as RequestGroup[];
  }, [props.collections, q]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    window.addEventListener("blur", closeMenu);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("blur", closeMenu);
    };
  }, []);

  useEffect(() => {
    const node = treeRef.current;
    if (!node) return;

    const closeMenu = () => setContextMenu(null);
    node.addEventListener("scroll", closeMenu);
    return () => node.removeEventListener("scroll", closeMenu);
  }, []);

  function pickCollectionsImport() {
    collectionFileRef.current?.click();
  }

  async function onCollectionsFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text) as RequestGroup[];
      if (Array.isArray(data)) props.onImportCollections(data);
    } catch {
      // ignore invalid file
    }
  }

  function toggleGroup(groupId: string) {
    setCollapsedGroupIds((current) => ({ ...current, [groupId]: !current[groupId] }));
  }

  function openRootMenu(event: MouseEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, type: "root" });
  }

  function openGroupMenu(event: MouseEvent, group: RequestGroup) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, type: "group", groupId: group.id, groupName: group.name });
  }

  function openRequestMenu(event: MouseEvent, groupId: string, itemId: string, itemName: string) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, type: "request", groupId, itemId, itemName });
  }

  async function confirmRemoveGroup(groupId: string, groupName: string) {
    const ok = await confirm(m.confirmDeleteGroup(groupName), {
      title: m.confirmDeleteTitle,
      kind: "warning",
      okLabel: m.confirmDeleteOk,
      cancelLabel: m.confirmCancel,
    });
    if (!ok) return;
    props.onRemoveGroup(groupId);
  }

  async function confirmRemoveRequest(groupId: string, itemId: string, itemName: string) {
    const ok = await confirm(m.confirmDeleteRequest(itemName), {
      title: m.confirmDeleteTitle,
      kind: "warning",
      okLabel: m.confirmDeleteOk,
      cancelLabel: m.confirmCancel,
    });
    if (!ok) return;
    props.onRemoveRequest(groupId, itemId);
  }

  function startRenameGroup(groupId: string, currentName: string) {
    setEditing({ type: "group", groupId, value: currentName || m.unnamedGroup });
  }

  function startRenameRequest(groupId: string, itemId: string, currentName: string) {
    setEditing({ type: "request", groupId, itemId, value: currentName || m.unnamedRequest });
  }

  function commitRename() {
    if (!editing) return;

    const nextValue =
      editing.type === "group"
        ? editing.value.trim() || m.unnamedGroup
        : editing.value.trim() || m.unnamedRequest;

    if (editing.type === "group") {
      props.onRenameGroup(editing.groupId, nextValue);
    } else {
      props.onRenameRequest(editing.groupId, editing.itemId, nextValue);
    }

    setEditing(null);
  }

  function renderContextMenu() {
    if (!contextMenu) return null;

    const style = {
      left: Math.min(contextMenu.x, window.innerWidth - 180),
      top: Math.min(contextMenu.y, window.innerHeight - 160),
    };

    if (contextMenu.type === "root") {
      return (
        <div className="treeContextMenu" style={style} onClick={(e) => e.stopPropagation()}>
          <button type="button" className="treeContextItem" onClick={() => { props.onAddGroup(null); setContextMenu(null); }}>
            {m.newGroup}
          </button>
        </div>
      );
    }

    if (contextMenu.type === "group") {
      return (
        <div className="treeContextMenu" style={style} onClick={(e) => e.stopPropagation()}>
          <button type="button" className="treeContextItem" onClick={() => { startRenameGroup(contextMenu.groupId, contextMenu.groupName); setContextMenu(null); }}>
            {m.renameGroup}
          </button>
          <button type="button" className="treeContextItem" onClick={() => { props.onAddGroup(contextMenu.groupId); setContextMenu(null); }}>
            {m.newChildGroup}
          </button>
          <button type="button" className="treeContextItem" onClick={() => { props.onAddRequest(contextMenu.groupId); setContextMenu(null); }}>
            {m.newRequest}
          </button>
          <button type="button" className="treeContextItem danger" onClick={() => { void confirmRemoveGroup(contextMenu.groupId, contextMenu.groupName); setContextMenu(null); }}>
            {m.deleteGroup}
          </button>
        </div>
      );
    }

    return (
      <div className="treeContextMenu" style={style} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="treeContextItem" onClick={() => { startRenameRequest(contextMenu.groupId, contextMenu.itemId, contextMenu.itemName); setContextMenu(null); }}>
          {m.renameRequest}
        </button>
        <button type="button" className="treeContextItem" onClick={() => { props.onAddRequest(contextMenu.groupId); setContextMenu(null); }}>
          {m.newSiblingRequest}
        </button>
        <button type="button" className="treeContextItem danger" onClick={() => { void confirmRemoveRequest(contextMenu.groupId, contextMenu.itemId, contextMenu.itemName); setContextMenu(null); }}>
          {m.deleteRequest}
        </button>
      </div>
    );
  }

  function renderGroup(group: RequestGroup, depth = 0) {
    const collapsed = Boolean(collapsedGroupIds[group.id]);
    const isEditingGroup = editing?.type === "group" && editing.groupId === group.id;

    return (
      <div key={group.id} className="treeNode">
        <div className="treeRow treeGroupRow" style={{ paddingLeft: 12 + depth * 16 }} onContextMenu={(event) => openGroupMenu(event, group)}>
          <button
            type="button"
            className="treeToggle"
            onClick={() => toggleGroup(group.id)}
            aria-label={collapsed ? `${m.expandGroup} ${group.name}` : `${m.collapseGroup} ${group.name}`}
            title={collapsed ? m.expandGroup : m.collapseGroup}
          >
            {collapsed ? "▸" : "▾"}
          </button>
          <span className="treeBranchMark">{m.groupMarker}</span>
          {isEditingGroup ? (
            <input
              className="treeInlineInput treeGroupInput"
              value={editing.value}
              autoFocus
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => setEditing({ ...editing, value: event.currentTarget.value })}
              onBlur={commitRename}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitRename();
                if (event.key === "Escape") setEditing(null);
              }}
            />
          ) : (
            <span className="treeNameLabel treeGroupLabel" title={group.name}>
              {group.name || m.unnamedGroup}
            </span>
          )}
        </div>

        {!collapsed ? (
          <div className="treeChildren">
            {group.items.map((item) => {
              const isEditingRequest =
                editing?.type === "request" && editing.groupId === group.id && editing.itemId === item.id;

              return (
                <div
                  key={item.id}
                  className={item.id === props.activeCollectionItemId ? "treeRow treeRequestRow active" : "treeRow treeRequestRow"}
                  style={{ paddingLeft: 44 + depth * 16 }}
                  onClick={() => {
                    if (!isEditingRequest) props.onOpenRequest(group.id, item.id);
                  }}
                  onContextMenu={(event) => openRequestMenu(event, group.id, item.id, item.name)}
                >
                  <span className={`treeMethodMini ${item.request.method}`}>{item.request.method}</span>
                  {isEditingRequest ? (
                    <input
                      className="treeInlineInput treeRequestInput"
                      value={editing.value}
                      autoFocus
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => setEditing({ ...editing, value: event.currentTarget.value })}
                      onBlur={commitRename}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") commitRename();
                        if (event.key === "Escape") setEditing(null);
                      }}
                    />
                  ) : (
                    <span className="treeNameLabel treeRequestLabel" title={item.name}>
                      {item.name || m.unnamedRequest}
                    </span>
                  )}
                </div>
              );
            })}
            {group.childGroups.map((child) => renderGroup(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebarTop sidebarHero">
        <div className="heroTitleRow">
          <div className="appTitle">PostMini</div>
          <div className="heroTag">{m.appHero}</div>
        </div>
        <input value={q} onChange={(e) => setQ(e.currentTarget.value)} placeholder={m.searchPlaceholder} />
        <div className="sidebarButtons sidebarButtonsDense">
          <button type="button" className="btnGhost btnCompact" onClick={props.onExportCollections}>
            {m.exportCollections}
          </button>
          <button type="button" className="btnGhost btnCompact" onClick={pickCollectionsImport}>
            {m.importCollections}
          </button>
        </div>
        <input ref={collectionFileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={onCollectionsFileChange} />
      </div>

      <div ref={treeRef} className="sidebarTree sidebarTreeCompact" onContextMenu={openRootMenu}>
        {groups.length === 0 ? <div className="empty" /> : groups.map((group) => renderGroup(group))}
      </div>

      {renderContextMenu()}
    </aside>
  );
}
