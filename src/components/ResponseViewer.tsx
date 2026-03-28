import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight, vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { ResponseView } from "../types";

function tryFormatJson(text: string): { ok: boolean; formatted: string } {
  try {
    const v = JSON.parse(text);
    return { ok: true, formatted: JSON.stringify(v, null, 2) };
  } catch {
    return { ok: false, formatted: text };
  }
}

export function ResponseViewer(props: { response: ResponseView; theme: "light" | "dark" }) {
  const r = props.response;
  const body = r.bodyText ?? "";
  const formatted = tryFormatJson(body);
  const code = formatted.formatted || "";

  return (
    <div className="responsePanel">
      <div className="responseMeta">
        <div>
          <span className="metaLabel">Status</span> <span className={r.ok ? "pill ok" : "pill err"}>{r.status ?? "-"}</span>
        </div>
        <div>
          <span className="metaLabel">耗时</span> <span className="pill">{r.elapsedMs != null ? `${r.elapsedMs} ms` : "-"}</span>
        </div>
        <div className="metaGrow" />
        {r.error ? <div className="pill err">错误：{r.error}</div> : null}
      </div>

      <div className="responseBody">
        <SyntaxHighlighter
          language={formatted.ok ? "json" : "text"}
          style={props.theme === "dark" ? vscDarkPlus : oneLight}
          customStyle={{ margin: 0, background: "transparent" }}
          wrapLongLines
        >
          {code || ""}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

