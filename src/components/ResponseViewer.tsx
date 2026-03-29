import { save } from "@tauri-apps/plugin-dialog";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight, vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getMessages, type Locale } from "../i18n";
import type { RequestDraft, ResponseView } from "../types";

function tryFormatJson(text: string): { ok: boolean; formatted: string } {
  try {
    const value = JSON.parse(text);
    return { ok: true, formatted: JSON.stringify(value, null, 2) };
  } catch {
    return { ok: false, formatted: text };
  }
}

function tryFormatXml(text: string): { ok: boolean; formatted: string } {
  const trimmed = text.trim();
  if (!trimmed.startsWith("<") || !trimmed.endsWith(">")) {
    return { ok: false, formatted: text };
  }

  try {
    const normalized = trimmed
      .replace(/>\s+</g, "><")
      .replace(/(>)(<)(\/*)/g, "$1\n$2$3");

    const lines = normalized.split("\n");
    let indent = 0;
    const formatted = lines
      .map((line) => {
        const current = line.trim();
        if (!current) return "";

        if (/^<\//.test(current)) {
          indent = Math.max(indent - 1, 0);
        }

        const output = `${"  ".repeat(indent)}${current}`;

        if (/^<[^!?/][^>]*[^/]?>$/.test(current) && !/<\/[^>]+>$/.test(current)) {
          indent += 1;
        }

        return output;
      })
      .filter(Boolean)
      .join("\n");

    return { ok: true, formatted };
  } catch {
    return { ok: false, formatted: text };
  }
}

function formatResponseContent(text: string): { language: string; formatted: string } {
  const json = tryFormatJson(text);
  if (json.ok) return { language: "json", formatted: json.formatted };

  const xml = tryFormatXml(text);
  if (xml.ok) return { language: "markup", formatted: xml.formatted };

  return { language: "text", formatted: text };
}

export function ResponseViewer(props: {
  locale: Locale;
  request: RequestDraft;
  response: ResponseView;
  theme: "light" | "dark";
  onChangeRequest: (patch: Partial<RequestDraft>) => void;
}) {
  const m = getMessages(props.locale);
  const r = props.response;
  const errorText = r.error?.trim() ?? "";
  const isBusinessError = !errorText && typeof r.status === "number" && r.status >= 400;
  const body = r.bodyText ?? "";
  const formatted = formatResponseContent(body);

  async function pickSavePath() {
    try {
      const path = await save({ title: m.saveResponseDialogTitle });
      if (path) props.onChangeRequest({ saveResponseTo: path });
    } catch {
      // ignore cancel or non-Tauri environments
    }
  }

  return (
    <div className="responsePanel">
      <div className="responseMeta">
        <div>
          <span className="metaLabel">{m.status}</span> <span className={r.ok ? "pill ok" : "pill err"}>{r.status ?? "-"}</span>
        </div>
        <div>
          <span className="metaLabel">{m.elapsed}</span> <span className="pill">{r.elapsedMs != null ? `${r.elapsedMs} ms` : "-"}</span>
        </div>
        <div className="metaGrow" />
        {errorText ? <div className="pill err">{m.error}: {errorText}</div> : null}
      </div>

      <div className="responseSaveRow">
        <span className="saveLabel">{m.saveResponse}</span>
        <input
          className="mono"
          readOnly
          value={props.request.saveResponseTo}
          placeholder={m.saveResponsePlaceholder}
          title={props.request.saveResponseTo}
        />
        <button type="button" className="btnGhost" onClick={pickSavePath}>
          {m.choosePath}
        </button>
        <button type="button" className="btnGhost" onClick={() => props.onChangeRequest({ saveResponseTo: "" })}>
          {m.clear}
        </button>
      </div>

      <div className="responseBody">
        {isBusinessError ? (
          <div className="responseWarningBlock">
            <div className="responseWarningTitle">{m.businessErrorResponse}</div>
            <div className="responseWarningText">{m.businessErrorHint}</div>
          </div>
        ) : null}

        {errorText ? (
          <div className="responseErrorBlock">
            <div className="responseErrorTitle">{m.error}</div>
            <pre className="responseErrorText">{errorText}</pre>
          </div>
        ) : (
          <SyntaxHighlighter
            language={formatted.language}
            style={props.theme === "dark" ? vscDarkPlus : oneLight}
            customStyle={{ margin: 0, background: "transparent" }}
            wrapLongLines
            showLineNumbers
            lineNumberStyle={{ minWidth: "2.8em", opacity: 0.45, userSelect: "none" }}
          >
            {formatted.formatted || ""}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  );
}
