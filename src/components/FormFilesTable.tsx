import { open } from "@tauri-apps/plugin-dialog";
import { getMessages, type Locale } from "../i18n";
import type { FormFileRow } from "../types";

export function FormFilesTable(props: { locale: Locale; rows: FormFileRow[]; onChange: (next: FormFileRow[]) => void }) {
  const m = getMessages(props.locale);
  const rows = props.rows.length ? props.rows : [{ key: "", path: "" }];

  function setRow(idx: number, patch: Partial<FormFileRow>) {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    props.onChange(next);
  }

  function addRow() {
    props.onChange([...rows, { key: "", path: "" }]);
  }

  function delRow(idx: number) {
    const next = rows.filter((_, i) => i !== idx);
    props.onChange(next.length ? next : [{ key: "", path: "" }]);
  }

  async function browse(idx: number) {
    try {
      const sel = await open({ multiple: false, directory: false });
      const path = Array.isArray(sel) ? sel[0] : sel;
      if (path) setRow(idx, { path });
    } catch {
      // ignore non-Tauri environments or cancellation
    }
  }

  return (
    <div className="kvTable formFilesTable">
      <div className="kvHeader formFilesHeader">
        <div>{m.fieldName}</div>
        <div>{m.localFile}</div>
        <div />
      </div>
      {rows.map((r, idx) => (
        <div className="kvRow formFilesRow" key={idx}>
          <input value={r.key} onChange={(e) => setRow(idx, { key: e.currentTarget.value })} placeholder={m.fileExample} />
          <div className="filePathCell">
            <input readOnly value={r.path} placeholder={m.fileChoosePlaceholder} title={r.path} />
            <button type="button" className="btnGhost" onClick={() => browse(idx)}>
              {m.browse}
            </button>
          </div>
          <div className="kvActions">
            <button type="button" className="btnGhost" onClick={() => delRow(idx)} title={m.delete}>
              ×
            </button>
          </div>
        </div>
      ))}
      <div className="kvFooter">
        <button type="button" className="btnGhost" onClick={addRow}>
          + {m.addFileField}
        </button>
      </div>
    </div>
  );
}
