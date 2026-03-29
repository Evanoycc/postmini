import { invoke } from "@tauri-apps/api/core";
import type { FormFileRow, KvPair, RequestDraft } from "../types";

type HttpRequestInput = {
  url: string;
  method: string;
  headers: KvPair[];
  bodyType: string;
  bodyText?: string | null;
  formData?: KvPair[] | null;
  formFiles?: KvPair[] | null;
  saveResponseTo?: string | null;
  timeoutMs?: number | null;
};

type HttpResponseOutput = {
  ok: boolean;
  status: number;
  elapsedMs: number;
  headers: KvPair[];
  bodyText: string;
};

type SaveTextFileInput = {
  path: string;
  content: string;
};

function formFilesToKv(rows: FormFileRow[]): KvPair[] {
  return rows
    .filter((r) => r.key.trim() && r.path.trim())
    .map((r) => ({ key: r.key.trim(), value: r.path.trim() }));
}

function appendParams(url: string, params: KvPair[]): string {
  try {
    const nextUrl = new URL(url);
    for (const pair of params) {
      const key = pair.key.trim();
      if (!key) continue;
      nextUrl.searchParams.append(key, pair.value);
    }
    return nextUrl.toString();
  } catch {
    const validParams = params.filter((pair) => pair.key.trim());
    if (!validParams.length) return url;
    const search = validParams
      .map((pair) => `${encodeURIComponent(pair.key.trim())}=${encodeURIComponent(pair.value)}`)
      .join("&");
    return `${url}${url.includes("?") ? "&" : "?"}${search}`;
  }
}

function buildHeaders(req: RequestDraft): KvPair[] {
  const headers = req.headers.filter((header) => header.key.trim());

  if (req.authorizationType === "bearer" && req.authBearerToken.trim()) {
    headers.push({ key: "Authorization", value: `Bearer ${req.authBearerToken.trim()}` });
  }

  if (req.authorizationType === "basic" && (req.authBasicUsername || req.authBasicPassword)) {
    const encoded = btoa(`${req.authBasicUsername}:${req.authBasicPassword}`);
    headers.push({ key: "Authorization", value: `Basic ${encoded}` });
  }

  return headers;
}

export async function sendHttp(req: RequestDraft, timeoutMs = 300_000): Promise<HttpResponseOutput> {
  const savePath = req.saveResponseTo.trim();
  const input: HttpRequestInput = {
    url: appendParams(req.url, req.params),
    method: req.method,
    headers: buildHeaders(req),
    bodyType: req.bodyType,
    bodyText: req.bodyType === "json" ? req.bodyText : null,
    formData: req.bodyType === "formData" ? req.formData : null,
    formFiles: req.bodyType === "formData" ? formFilesToKv(req.formFiles) : null,
    saveResponseTo: savePath ? savePath : null,
    timeoutMs,
  };
  return await invoke<HttpResponseOutput>("send_http", { input });
}

export async function saveTextFile(path: string, content: string): Promise<void> {
  const input: SaveTextFileInput = { path, content };
  await invoke("save_text_file", { input });
}
