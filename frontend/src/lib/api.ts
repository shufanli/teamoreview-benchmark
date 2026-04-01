const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "/teamoreview";

// In dev, API calls go through Next.js rewrites to localhost:8000
// In prod, API calls go to the same domain
function getApiBase(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${BASE_PATH}`;
  }
  return BASE_PATH;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API error");
  }
  return res.json();
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API error");
  }
  return res.json();
}
