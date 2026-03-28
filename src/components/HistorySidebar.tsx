import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import { confirm } from "@tauri-apps/plugin-dialog";
import type { RequestGroup } from "../types";

type ContextMenuState =
  | {
      x: number;
      y: number;
      type: "root";
    }
  | {
      x: number;
      y: number;
      type: "group";
      groupId: string;
      groupName: string;
    }
  | {
      x: number;
      y: number;
      type: "request";
      groupId: string;
      itemId: string;
      itemName: string;
    };

export function HistorySidebar(props: {
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
  const [q, setQ] = useState("");
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
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
    const f = e.currentTarget.files?.[0];
    e.currentTarget.value = "";
    if (!f) return;
    const text = await f.text();
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
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: "group",
      groupId: group.id,
      groupName: group.name,
    });
  }

  function openRequestMenu(event: MouseEvent, groupId: string, itemId: string, itemName: string) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: "request",
      groupId,
      itemId,
      itemName,
    });
  }

  async function confirmRemoveGroup(groupId: string, groupName: string) {
    const ok = await confirm(`是否确定删除分组“${groupName}”？\n删除后，分组内的所有接口和子分组也会一起删除。`, {
      title: "确认删除",
      kind: "warning",
      okLabel: "确定删除",
      cancelLabel: "取消",
    });
    if (!ok) return;
    props.onRemoveGroup(groupId);
  }

  async function confirmRemoveRequest(groupId: string, itemId: string, itemName: string) {
    const ok = await confirm(`是否确定删除接口“${itemName}”？`, {
      title: "确认删除",
      kind: "warning",
      okLabel: "确定删除",
      cancelLabel: "取消",
    });
    if (!ok) return;
    props.onRemoveRequest(groupId, itemId);
  }

  function renameGroup(groupId: string, currentName: string) {
    const nextName = window.prompt("请输入新的分组名称", currentName);
    if (nextName === null) return;
    props.onRenameGroup(groupId, nextName.trim() || "未命名分组");
  }

  function renameRequest(groupId: string, itemId: string, currentName: string) {
    const nextName = window.prompt("请输入新的接口名称", currentName);
    if (nextName === null) return;
    props.onRenameRequest(groupId, itemId, nextName.trim() || "未命名接口");
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
          <button
            type="button"
            className="treeContextItem"
            onClick={() => {
              props.onAddGroup(null);
              setContextMenu(null);
            }}
          >
            新建分组
          </button>
        </div>
      );
    }

    if (contextMenu.type === "group") {
      return (
        <div className="treeContextMenu" style={style} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="treeContextItem"
            onClick={() => {
              renameGroup(contextMenu.groupId, contextMenu.groupName);
              setContextMenu(null);
            }}
          >
            重命名分组
          </button>
          <button
            type="button"
            className="treeContextItem"
            onClick={() => {
              props.onAddGroup(contextMenu.groupId);
              setContextMenu(null);
            }}
          >
            新建子分组
          </button>
          <button
            type="button"
            className="treeContextItem"
            onClick={() => {
              props.onAddRequest(contextMenu.groupId);
              setContextMenu(null);
            }}
          >
            新建接口
          </button>
          <button
            type="button"
            className="treeContextItem danger"
            onClick={() => {
              void confirmRemoveGroup(contextMenu.groupId, contextMenu.groupName);
              setContextMenu(null);
            }}
          >
            删除分组
          </button>
        </div>
      );
    }

    return (
      <div className="treeContextMenu" style={style} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="treeContextItem"
          onClick={() => {
            renameRequest(contextMenu.groupId, contextMenu.itemId, contextMenu.itemName);
            setContextMenu(null);
          }}
        >
          重命名接口
        </button>
        <button
          type="button"
          className="treeContextItem"
          onClick={() => {
            props.onAddRequest(contextMenu.groupId);
            setContextMenu(null);
          }}
        >
          新建同级接口
        </button>
        <button
          type="button"
          className="treeContextItem danger"
          onClick={() => {
            void confirmRemoveRequest(contextMenu.groupId, contextMenu.itemId, contextMenu.itemName);
            setContextMenu(null);
          }}
        >
          删除接口
        </button>
      </div>
    );
  }

  function renderGroup(group: RequestGroup, depth = 0) {
    const collapsed = Boolean(collapsedGroupIds[group.id]);
    const isEmpty = group.items.length === 0 && group.childGroups.length === 0;

    return (
      <div key={group.id} className="treeNode">
        <div
          className="treeRow treeGroupRow"
          style={{ paddingLeft: 12 + depth * 16 }}
          onContextMenu={(event) => openGroupMenu(event, group)}
        >
          <button
            type="button"
            className="treeToggle"
            onClick={() => toggleGroup(group.id)}
            aria-label={collapsed ? `展开分组 ${group.name}` : `折叠分组 ${group.name}`}
            title={collapsed ? "展开" : "折叠"}
          >
            {collapsed ? "▸" : "▾"}
          </button>
          <span className="treeBranchMark">组</span>
          <span className="treeNameLabel treeGroupLabel" title={group.name}>
            {group.name || "未命名分组"}
          </span>
        </div>

        {!collapsed ? (
          <div className="treeChildren">
            {group.items.map((item) => (
              <div
                key={item.id}
                className={item.id === props.activeCollectionItemId ? "treeRow treeRequestRow active" : "treeRow treeRequestRow"}
                style={{ paddingLeft: 44 + depth * 16 }}
                onClick={() => props.onOpenRequest(group.id, item.id)}
                onContextMenu={(event) => openRequestMenu(event, group.id, item.id, item.name)}
              >
                <span className="treeNameLabel treeRequestLabel" title={item.name}>
                  {item.name || "未命名接口"}
                </span>
              </div>
            ))}

            {group.childGroups.map((child) => renderGroup(child, depth + 1))}

            {isEmpty ? (
              <div className="treeHint" style={{ paddingLeft: 44 + depth * 16 }}>
                右键这个分组可新建子分组或接口
              </div>
            ) : null}
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
          <div className="heroTag">接口工作台</div>
        </div>
        <input value={q} onChange={(e) => setQ(e.currentTarget.value)} placeholder="搜索分组、接口、URL 或 Method" />
        <div className="sidebarSectionHeader">
          <span className="sectionCaption">接口树</span>
          <span className="treeTips">右键新增</span>
        </div>
        <div className="sidebarButtons sidebarButtonsDense">
          <button type="button" className="btnGhost btnCompact" onClick={props.onExportCollections}>
            导出接口
          </button>
          <button type="button" className="btnGhost btnCompact" onClick={pickCollectionsImport}>
            导入接口
          </button>
        </div>
        <input
          ref={collectionFileRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={onCollectionsFileChange}
        />
      </div>

      <div ref={treeRef} className="sidebarTree sidebarTreeCompact" onContextMenu={openRootMenu}>
        {groups.length === 0 ? <div className="empty">右键空白区域新建分组</div> : groups.map((group) => renderGroup(group))}
      </div>

      {renderContextMenu()}
    </aside>
  );
}
