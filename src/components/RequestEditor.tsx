import { useState } from "react";
import { getMessages, type Locale } from "../i18n";
import type { AuthorizationType, BodyType, HttpMethod, RequestDraft } from "../types";
import { FormFilesTable } from "./FormFilesTable";
import { JsonEditor } from "./JsonEditor";
import { KvTable } from "./KvTable";

type EditorSection = "headers" | "params" | "authorization" | "body";

export function RequestEditor(props: {
  locale: Locale;
  request: RequestDraft;
  sending: boolean;
  onChange: (patch: Partial<RequestDraft>) => void;
  onSend: () => void;
}) {
  const r = props.request;
  const m = getMessages(props.locale);
  const [section, setSection] = useState<EditorSection>("headers");

  const sections: { key: EditorSection; label: string }[] = [
    { key: "headers", label: m.headers },
    { key: "params", label: m.params },
    { key: "authorization", label: m.authorization },
    { key: "body", label: m.body },
  ];

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
          placeholder="https://api.example.com/v1/xxx or {{base_url}}/v1/xxx"
        />
        <button type="button" className="btnPrimary" onClick={props.onSend} disabled={props.sending}>
          {props.sending ? m.requestSending : m.requestSend}
        </button>
      </div>

      <div className="requestSectionTabs">
        {sections.map((item) => (
          <button
            key={item.key}
            type="button"
            className={section === item.key ? "requestSectionTab active" : "requestSectionTab"}
            onClick={() => setSection(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="requestSectionPanel">
        {section === "headers" ? (
          <KvTable locale={props.locale} rows={r.headers} onChange={(headers) => props.onChange({ headers })} />
        ) : null}

        {section === "params" ? (
          <KvTable locale={props.locale} rows={r.params} onChange={(params) => props.onChange({ params })} />
        ) : null}

        {section === "authorization" ? (
          <div className="authPanel">
            <div className="authTypeRow">
              <select
                value={r.authorizationType}
                onChange={(e) => props.onChange({ authorizationType: e.currentTarget.value as AuthorizationType })}
              >
                <option value="none">{m.authNone}</option>
                <option value="bearer">{m.authBearer}</option>
                <option value="basic">{m.authBasic}</option>
              </select>
            </div>

            {r.authorizationType === "none" ? <div className="empty">{m.authHintNone}</div> : null}

            {r.authorizationType === "bearer" ? (
              <div className="authFields">
                <div className="subsectionTitle">{m.authToken}</div>
                <input
                  value={r.authBearerToken}
                  onChange={(e) => props.onChange({ authBearerToken: e.currentTarget.value })}
                  placeholder={m.authToken}
                />
              </div>
            ) : null}

            {r.authorizationType === "basic" ? (
              <div className="authFields">
                <div className="subsectionTitle">{m.authUsername}</div>
                <input
                  value={r.authBasicUsername}
                  onChange={(e) => props.onChange({ authBasicUsername: e.currentTarget.value })}
                  placeholder={m.authUsername}
                />
                <div className="subsectionTitle">{m.authPassword}</div>
                <input
                  type="password"
                  value={r.authBasicPassword}
                  onChange={(e) => props.onChange({ authBasicPassword: e.currentTarget.value })}
                  placeholder={m.authPassword}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {section === "body" ? (
          <>
            <div className="bodyTypeRow">
              <select
                value={r.bodyType}
                onChange={(e) => props.onChange({ bodyType: e.currentTarget.value as BodyType })}
              >
                <option value="none">none</option>
                <option value="json">JSON</option>
                <option value="formData">{m.formData}</option>
              </select>
            </div>

            {r.bodyType === "json" ? <JsonEditor locale={props.locale} value={r.bodyText} onChange={(bodyText) => props.onChange({ bodyText })} /> : null}

            {r.bodyType === "formData" ? (
              <>
                <div className="subsectionTitle">{m.textFields}</div>
                <KvTable
                  locale={props.locale}
                  rows={r.formData}
                  onChange={(formData) => props.onChange({ formData })}
                  keyPlaceholder="field"
                  valuePlaceholder="value"
                />
                <div className="subsectionTitle">{m.fileFields}</div>
                <FormFilesTable locale={props.locale} rows={r.formFiles} onChange={(formFiles) => props.onChange({ formFiles })} />
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
