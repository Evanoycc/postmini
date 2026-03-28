import { open } from "@tauri-apps/plugin-dialog";
import type { FormFileRow } from "../types";

export function FormFilesTable(props: { rows: FormFileRow[]; onChange: (next: FormFileRow[]) => void }) {
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
      /* 非 Tauri 环境或用户取消 */
    }
  }

  return (
    <div className="kvTable formFilesTable">
      <div className="kvHeader formFilesHeader">
        <div>字段名</div>
        <div>本地文件</div>
        <div />
      </div>
      {rows.map((r, idx) => (
        <div className="kvRow formFilesRow" key={idx}>
          <input
            value={r.key}
            onChange={(e) => setRow(idx, { key: e.currentTarget.value })}
            placeholder="例如 file"
          />
          <div className="filePathCell">
            <input readOnly value={r.path} placeholder="点击右侧浏览选择文件" title={r.path} />
            <button type="button" className="btnGhost" onClick={() => browse(idx)}>
              浏览
            </button>
          </div>
          <div className="kvActions">
            <button type="button" className="btnGhost" onClick={() => delRow(idx)} title="删除">
              ×
            </button>
          </div>
        </div>
      ))}
      <div className="kvFooter">
        <button type="button" className="btnGhost" onClick={addRow}>
          + 添加文件字段
        </button>
      </div>
    </div>
  );
}
