import { getMessages, type Locale } from "../i18n";
import type { HttpMethod } from "../types";

export function TabsBar(props: {
  locale: Locale;
  tabs: { id: string; title: string; method: HttpMethod }[];
  activeId: string;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
}) {
  const m = getMessages(props.locale);

  return (
    <div className="tabsBar">
      <div className="tabsScroll">
        {props.tabs.map((t) => (
          <div key={t.id} className={t.id === props.activeId ? "tab active" : "tab"}>
            <button type="button" className="tabBtn" onClick={() => props.onActivate(t.id)} title={m.switchTab}>
              <span className="tabTitle" title={`${t.method} ${t.title}`}>
                <span className="tabMethod">{t.method}</span>
                <span className="tabTitleText">{t.title}</span>
              </span>
            </button>
            <button type="button" className="tabClose" onClick={() => props.onClose(t.id)} title={m.closeTab}>
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
