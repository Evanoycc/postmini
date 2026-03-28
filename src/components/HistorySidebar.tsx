import { useMemo, useRef, useState } from "react";
import type { RequestGroup } from "../types";

export function HistorySidebar(props: {
  collections: RequestGroup[];
  activeCollectionItemId: string | null;
  onAddGroup: () => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onAddRequest: (groupId: string) => void;
  onRenameRequest: (groupId: string, itemId: string, name: string) => void;
  onRemoveRequest: (groupId: string, itemId: string) => void;
  onOpenRequest: (groupId: string, itemId: string) => void;
  onExportCollections: () => void;
  onImportCollections: (groups: RequestGroup[]) => void;
}) {
  const [q, setQ] = useState("");
  const collectionFileRef = useRef<HTMLInputElement | null>(null);

  const groups = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return props.collections;
    return props.collections
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const name = item.name.toLowerCase();
          const url = item.request.url.toLowerCase();
          const method = item.request.method.toLowerCase();
          return name.includes(qq) || url.includes(qq) || method.includes(qq);
        }),
      }))
      .filter((group) => group.name.toLowerCase().includes(qq) || group.items.length > 0);
  }, [props.collections, q]);

  function pickCollectionsImport() {
    collectionFileRef.current?.click();
  }

  async function onCollectionsFileChange(e: React.ChangeEvent<HTMLInputElement>) {
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

  return (
    <aside className="sidebar">
      <div className="sidebarTop sidebarHero">
        <div className="heroTitleRow">
          <div className="appTitle">PostMini</div>
          <div className="heroTag">接口工作台</div>
        </div>
        <input value={q} onChange={(e) => setQ(e.currentTarget.value)} placeholder="搜索分组、接口、URL 或 Method" />
        <div className="sidebarSectionHeader">
          <span className="sectionCaption">接口分组</span>
          <button type="button" className="btnGhost btnCompact btnStrong" onClick={props.onAddGroup}>
            + 新建分组
          </button>
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

      <div className="sidebarTree">
        {groups.length === 0 ? <div className="empty">暂无分组</div> : null}
        {groups.map((group) => (
          <section key={group.id} className="groupCard">
            <div className="groupHeader">
              <input
                className="groupNameInput"
                value={group.name}
                onChange={(e) => props.onRenameGroup(group.id, e.currentTarget.value)}
              />
              <button type="button" className="btnGhost btnCompact btnNoWrap" onClick={() => props.onAddRequest(group.id)}>
                + 接口
              </button>
            </div>
            <div className="groupItems">
              {group.items.length === 0 ? <div className="empty compact">这个分组里还没有接口</div> : null}
              {group.items.map((item) => (
                <div key={item.id} className={item.id === props.activeCollectionItemId ? "apiItem active" : "apiItem"}>
                  <span className={`methodBadge ${item.request.method}`}>{item.request.method}</span>
                  <input
                    className="apiNameInput"
                    value={item.name}
                    onChange={(e) => props.onRenameRequest(group.id, item.id, e.currentTarget.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    type="button"
                    className="apiOpenBtn"
                    onClick={() => props.onOpenRequest(group.id, item.id)}
                    title="打开接口"
                  >
                    打开
                  </button>
                  <button
                    type="button"
                    className="apiDeleteBtn"
                    onClick={() => props.onRemoveRequest(group.id, item.id)}
                    title="删除接口"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
