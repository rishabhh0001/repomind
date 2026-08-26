const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function importRepo(url: string, branch = "main") {
  const res = await fetch(`${API_BASE}/repos/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, branch }),
  });
  if (!res.ok) throw new Error("Failed to import repo");
  return res.json();
}

export async function getRepo(id: number) {
  const res = await fetch(`${API_BASE}/repos/${id}`);
  if (!res.ok) throw new Error("Failed to get repo");
  return res.json();
}

export async function getRepos() {
  const res = await fetch(`${API_BASE}/repos`);
  if (!res.ok) throw new Error("Failed to get repos");
  return res.json();
}

export async function getGraph(repoId: number) {
  const res = await fetch(`${API_BASE}/graph/${repoId}`);
  if (!res.ok) throw new Error("Failed to get graph");
  return res.json();
}

export async function getNodeDetail(symbolId: string | number) {
  const res = await fetch(`${API_BASE}/graph/nodes/${encodeURIComponent(symbolId)}`);
  if (!res.ok) throw new Error("Failed to get node detail");
  return res.json();
}

export async function queryRepo(repoId: number, question: string) {
  const res = await fetch(`${API_BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_id: repoId, question }),
  });
  if (!res.ok) {
    let message = `Server error (${res.status})`;
    try {
      const data = await res.json();
      if (data && data.detail) {
        message = data.detail;
      }
    } catch {
      // fallback
    }
    throw new Error(message);
  }
  return res.json();
}
