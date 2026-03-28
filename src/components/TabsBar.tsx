export function TabsBar(props: {
  tabs: { id: string; title: string }[];
  activeId: string;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
}) {
  return (
    <div className="tabsBar">
      <div className="tabsScroll">
        {props.tabs.map((t) => (
          <div key={t.id} className={t.id === props.activeId ? "tab active" : "tab"}>
            <button type="button" className="tabBtn" onClick={() => props.onActivate(t.id)} title="切换标签">
              <span className="tabTitle" title={t.title}>
                {t.title}
              </span>
            </button>
            <button type="button" className="tabClose" onClick={() => props.onClose(t.id)} title="关闭">
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
