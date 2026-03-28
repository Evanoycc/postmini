import type { KvPair } from "../types";

export function KvTable(props: {
  rows: KvPair[];
  onChange: (next: KvPair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}) {
  const rows = props.rows.length ? props.rows : [{ key: "", value: "" }];

  function setRow(idx: number, patch: Partial<KvPair>) {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    props.onChange(next);
  }

  function addRow() {
    props.onChange([...rows, { key: "", value: "" }]);
  }

  function delRow(idx: number) {
    const next = rows.filter((_, i) => i !== idx);
    props.onChange(next.length ? next : [{ key: "", value: "" }]);
  }

  return (
    <div className="kvTable">
      <div className="kvHeader">
        <div>Key</div>
        <div>Value</div>
        <div />
      </div>
      {rows.map((r, idx) => (
        <div className="kvRow" key={idx}>
          <input
            value={r.key}
            onChange={(e) => setRow(idx, { key: e.currentTarget.value })}
            placeholder={props.keyPlaceholder ?? "key"}
          />
          <input
            value={r.value}
            onChange={(e) => setRow(idx, { value: e.currentTarget.value })}
            placeholder={props.valuePlaceholder ?? "value"}
          />
          <div className="kvActions">
            <button type="button" className="btnGhost" onClick={() => delRow(idx)} title="删除">
              ×
            </button>
          </div>
        </div>
      ))}
      <div className="kvFooter">
        <button type="button" className="btnGhost" onClick={addRow}>
          + 添加
        </button>
      </div>
    </div>
  );
}

