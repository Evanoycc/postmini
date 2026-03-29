export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export type BodyType = "none" | "json" | "formData";

export type AuthorizationType = "none" | "bearer" | "basic";

export type KvPair = { key: string; value: string };

export type FormFileRow = { key: string; path: string };

export type RequestDraft = {
  id: string;
  name: string;
  collectionGroupId?: string | null;
  collectionItemId?: string | null;
  url: string;
  method: HttpMethod;
  headers: KvPair[];
  params: KvPair[];
  authorizationType: AuthorizationType;
  authBearerToken: string;
  authBasicUsername: string;
  authBasicPassword: string;
  bodyType: BodyType;
  bodyText: string;
  formData: KvPair[];
  formFiles: FormFileRow[];
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
  childGroups: RequestGroup[];
};
