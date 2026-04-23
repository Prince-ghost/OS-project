// ── REAL DATA FETCHING MODULE ────────────────────────────────

async function getSystemMetrics() {
  const res = await fetch('/api/system');
  if (!res.ok) throw new Error('Failed to fetch system metrics');
  return await res.json();
}

async function getProcesses() {
  const res = await fetch('/api/processes');
  if (!res.ok) throw new Error('Failed to fetch processes');
  return await res.json();
}

async function killProcess(pid) {
  const res = await fetch(`/api/kill/${pid}`, { method: 'POST' });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function niceProcess(pid) {
  const res = await fetch(`/api/nice/${pid}`, { method: 'POST' });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}
