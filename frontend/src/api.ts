// Small API client: JSON calls with the bearer token + image sources.
import { Platform } from "react-native";

// Par défaut l'API est sur le même site (adresse relative "/api"). EXPO_PUBLIC_BACKEND_URL
// ne sert que pour pointer vers un autre serveur pendant le développement.
export const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL ?? ""}/api`;

let token: string | null = null;
let onUnauthorized: () => void = () => {};

export function setApiToken(t: string | null) {
  token = t;
}
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}
export function authHeaders(): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  const controller = opts.timeoutMs ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), opts.timeoutMs) : null;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? "GET",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller?.signal,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (res.status === 401 && token) onUnauthorized();
  if (!res.ok) {
    let msg = "Oups, quelque chose s'est mal passé";
    try {
      const data = await res.json();
      if (typeof data.detail === "string") msg = data.detail;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// Image stored in object storage -> source for expo-image.
// Web <img> cannot send headers, so the token goes in the query string there.
export function fileSource(path: string) {
  const url = `${API_URL}/files/${path}`;
  return Platform.OS === "web" ? { uri: `${url}?token=${token}` } : { uri: url, headers: authHeaders() };
}
