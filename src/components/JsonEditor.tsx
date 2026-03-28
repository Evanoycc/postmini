import { useMemo } from "react";

export function JsonEditor(props: { value: string; onChange: (v: string) => void; height?: number }) {
  const lines = useMemo(() => Math.min(30, Math.max(6, props.value.split("\n").length)), [props.value]);
  const rows = Math.floor(lines);

  function format() {
    try {
      const v = JSON.parse(props.value || "null");
      props.onChange(JSON.stringify(v, null, 2));
    } catch {
      // ignore - keep as-is
    }
  }

  return (
    <div className="jsonEditor">
      <div className="jsonEditorToolbar">
        <button type="button" className="btnGhost" onClick={format}>
          格式化 JSON
        </button>
      </div>
      <textarea
        spellCheck={false}
        className="mono"
        rows={rows}
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value)}
        placeholder='例如: { "foo": "bar" }'
      />
    </div>
  );
}

