export function TabsBar(props: {
  tabs: { id: string; title: string }[];
  activeId: string;
  onActivate: (id: string) => void;
  onNew: () => void;
  onClose: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  return (
    <div className="tabsBar">
      <div className="tabsScroll">
        {props.tabs.map((t) => (
          <div key={t.id} className={t.id === props.activeId ? "tab active" : "tab"}>
            <button type="button" className="tabBtn" onClick={() => props.onActivate(t.id)} title="切换标签">
              <input
                className="tabTitle"
                value={t.title}
                onChange={(e) => props.onRename(t.id, e.currentTarget.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </button>
            <button type="button" className="tabClose" onClick={() => props.onClose(t.id)} title="关闭">
              ×
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btnGhost btnNoWrap" onClick={props.onNew} title="新建标签">
        + 新建
      </button>
    </div>
  );
}
