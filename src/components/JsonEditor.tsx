import { useMemo } from "react";
import { getMessages, type Locale } from "../i18n";

export function JsonEditor(props: { locale: Locale; value: string; onChange: (v: string) => void; height?: number }) {
  const m = getMessages(props.locale);
  const lines = useMemo(() => Math.min(30, Math.max(6, props.value.split("\n").length)), [props.value]);
  const rows = Math.floor(lines);

  function format() {
    try {
      const v = JSON.parse(props.value || "null");
      props.onChange(JSON.stringify(v, null, 2));
    } catch {
      // ignore invalid JSON
    }
  }

  return (
    <div className="jsonEditor">
      <div className="jsonEditorToolbar">
        <button type="button" className="btnGhost" onClick={format}>
          {m.formatJson}
        </button>
      </div>
      <textarea spellCheck={false} className="mono" rows={rows} value={props.value} onChange={(e) => props.onChange(e.currentTarget.value)} placeholder={m.jsonPlaceholder} />
    </div>
  );
}
