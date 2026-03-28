import { save } from "@tauri-apps/plugin-dialog";
import type { BodyType, HttpMethod, RequestDraft } from "../types";
import { FormFilesTable } from "./FormFilesTable";
import { JsonEditor } from "./JsonEditor";
import { KvTable } from "./KvTable";

export function RequestEditor(props: {
  request: RequestDraft;
  sending: boolean;
  onChange: (patch: Partial<RequestDraft>) => void;
  onSend: () => void;
}) {
  const r = props.request;

  async function pickSavePath() {
    try {
      const p = await save({ title: "将响应体保存到" });
      if (p) props.onChange({ saveResponseTo: p });
    } catch {
      /* 取消或非 Tauri */
    }
  }

  return (
    <div className="requestPanel">
      <div className="requestTop">
        <select
          value={r.method}
          onChange={(e) => props.onChange({ method: e.currentTarget.value as HttpMethod })}
          className="methodSelect"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>
        <input
          className="urlInput mono"
          value={r.url}
          onChange={(e) => props.onChange({ url: e.currentTarget.value })}
          placeholder="https://api.example.com/v1/xxx 或 {{base_url}}/v1/xxx"
        />
        <button type="button" className="btnPrimary" onClick={props.onSend} disabled={props.sending}>
          {props.sending ? "发送中..." : "发送"}
        </button>
      </div>

      <div className="saveResponseRow">
        <span className="saveLabel">响应保存</span>
        <input
          className="mono"
          readOnly
          value={r.saveResponseTo}
          placeholder="留空则在界面显示正文；填写路径则流式写入磁盘（适合大文件下载）"
          title={r.saveResponseTo}
        />
        <button type="button" className="btnGhost" onClick={pickSavePath}>
          选择路径
        </button>
        <button type="button" className="btnGhost" onClick={() => props.onChange({ saveResponseTo: "" })}>
          清除
        </button>
      </div>

      <div className="section">
        <div className="sectionTitle">Headers</div>
        <KvTable rows={r.headers} onChange={(headers) => props.onChange({ headers })} />
      </div>

      <div className="section">
        <div className="sectionTitle">Body</div>
        <div className="bodyTypeRow">
          <select
            value={r.bodyType}
            onChange={(e) => props.onChange({ bodyType: e.currentTarget.value as BodyType })}
          >
            <option value="none">none</option>
            <option value="json">JSON</option>
            <option value="formData">form-data（文本 + 文件）</option>
          </select>
        </div>

        {r.bodyType === "json" ? (
          <JsonEditor value={r.bodyText} onChange={(bodyText) => props.onChange({ bodyText })} />
        ) : null}
        {r.bodyType === "formData" ? (
          <>
            <div className="subsectionTitle">文本字段</div>
            <KvTable
              rows={r.formData}
              onChange={(formData) => props.onChange({ formData })}
              keyPlaceholder="field"
              valuePlaceholder="value"
            />
            <div className="subsectionTitle">文件字段</div>
            <FormFilesTable rows={r.formFiles} onChange={(formFiles) => props.onChange({ formFiles })} />
          </>
        ) : null}
        {r.bodyType === "none" ? (
          <div className="hint">
            GET/DELETE 通常无 body；PUT 可使用 JSON 或 form-data；通过上方「响应保存」可下载二进制/大文件到本地。
          </div>
        ) : null}
      </div>
    </div>
  );
}
