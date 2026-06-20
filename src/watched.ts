export async function getWatched(): Promise<Set<string>> {
  const resp = await fetch("/api/watched");
  const ids: string[] = await resp.json();
  return new Set(ids);
}

export async function markWatched(id: string): Promise<void> {
  await fetch("/api/watched", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
}

export async function unmarkWatched(id: string): Promise<void> {
  await fetch("/api/watched", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
}
