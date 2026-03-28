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

export async function sendHttp(req: RequestDraft, timeoutMs = 300_000): Promise<HttpResponseOutput> {
  const savePath = req.saveResponseTo.trim();
  const input: HttpRequestInput = {
    url: req.url,
    method: req.method,
    headers: req.headers,
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
