export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export type BodyType = "none" | "json" | "formData";

export type KvPair = { key: string; value: string };

/** form-data 中的文件字段：path 为本地绝对路径（由系统文件对话框选择） */
export type FormFileRow = { key: string; path: string };

export type RequestDraft = {
  id: string;
  name: string;
  collectionGroupId?: string | null;
  collectionItemId?: string | null;
  url: string;
  method: HttpMethod;
  headers: KvPair[];
  bodyType: BodyType;
  bodyText: string;
  formData: KvPair[];
  formFiles: FormFileRow[];
  /** 非空时由 Rust 将响应体流式写入该路径 */
  saveResponseTo: string;
};

export type ResponseView = {
  status?: number;
  elapsedMs?: number;
  ok?: boolean;
  bodyText?: string;
  error?: string;
};

export type EnvVar = KvPair;

export type SavedRequestItem = {
  id: string;
  name: string;
  request: RequestDraft;
};

export type RequestGroup = {
  id: string;
  name: string;
  items: SavedRequestItem[];
};
