// ── PROCESS TABLE MODULE ──────────────────────────────────────
let _filterStr   = '';
let _statusFilter = '';
let _sortKey     = 'cpu';
let _sortAsc     = false;
let _pendingKill = null;
let _logEntries  = [];
let _logCount    = 0;

// ── RENDER TABLE ──────────────────────────────────────────────
function renderTable(processes) {
  let list = [...processes];

  if (_filterStr)   list = list.filter(p => p.name.toLowerCase().includes(_filterStr) || p.user.toLowerCase().includes(_filterStr));
  if (_statusFilter) list = list.filter(p => p.status === _statusFilter);

  list.sort((a, b) => {
    let av = a[_sortKey], bv = b[_sortKey];
    if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
    return _sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  document.getElementById('procCount').textContent = list.length + ' processes';

  const tbody = document.getElementById('procBody');
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="loading-row">No processes match your filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => {
    const cpuClass = p.cpu > 70 ? 'bar-high' : 'bar-cpu';
    const memClass = p.mem > 70 ? 'bar-high' : 'bar-mem';
    const rowClass = p.status === 'zombie' ? 'zombie-row' : '';
    const priClass = p.priority === 'high' ? 'priority-high' : p.priority === 'low' ? 'priority-low' : '';
    const cpuW = Math.min(p.cpu, 100).toFixed(0);
    const memW = Math.min(p.mem, 100).toFixed(0);

    return `<tr class="${rowClass}" data-pid="${p.pid}" onclick="showDetail(${p.pid})">
      <td class="pid-cell">${p.pid}</td>
      <td class="name-cell">${esc(p.name)}</td>
      <td><span class="badge badge-${p.status}">${p.status}</span></td>
      <td>
        <div class="bar-cell">
          <span class="val">${p.cpu.toFixed(1)}%</span>
          <div class="bar-wrap"><div class="bar-fill ${cpuClass}" style="width:${cpuW}%"></div></div>
        </div>
      </td>
      <td>
        <div class="bar-cell">
          <span class="val">${p.mem.toFixed(1)}%</span>
          <div class="bar-wrap"><div class="bar-fill ${memClass}" style="width:${memW}%"></div></div>
        </div>
      </td>
      <td>${p.threads}</td>
      <td style="color:var(--text3)">${esc(p.user)}</td>
      <td><span class="priority-badge ${priClass}">${p.priority}</span></td>
      <td class="actions" onclick="event.stopPropagation()">
        <button class="btn-action btn-kill" onclick="promptKill(${p.pid},'${esc(p.name)}')">⛔ Kill</button>
        <button class="btn-action btn-nice" onclick="doNice(${p.pid},'${esc(p.name)}')">⬇ Nice</button>
        <button class="btn-action btn-info" onclick="showDetail(${p.pid})">🔍 Info</button>
      </td>
    </tr>`;
  }).join('');
}

// ── FILTER / SORT ─────────────────────────────────────────────
function filterTable() {
  _filterStr    = document.getElementById('searchInput').value.toLowerCase().trim();
  _statusFilter = document.getElementById('statusFilter').value;
  renderTable(lastProcs || []);
}

function sortTable(key) {
  if (_sortKey === key) _sortAsc = !_sortAsc;
  else { _sortKey = key; _sortAsc = false; }
  document.getElementById('sortSelect').value = key;
  renderTable(lastProcs || []);
}

// ── KILL ──────────────────────────────────────────────────────
function promptKill(pid, name) {
  _pendingKill = pid;
  document.getElementById('killModalBody').textContent =
    `Kill process "${name}" (PID: ${pid})? This cannot be undone.`;
  document.getElementById('killConfirmBtn').onclick = confirmKill;
  document.getElementById('killModal').style.display = 'flex';
}

function confirmKill() {
  if (!_pendingKill) return;
  const p = (lastProcs || []).find(x => x.pid === _pendingKill);
  if (p) {
    const row = document.querySelector(`tr[data-pid="${_pendingKill}"]`);
    if (row) row.classList.add('row-kill');
    
    killProcess(_pendingKill).then(() => {
      addLog(`Killed process "${p.name}" (PID ${p.pid})`, 'log-kill');
      tick(); // force refresh
    }).catch(err => {
      addLog(`Failed to kill "${p.name}": ${err.message}`, 'log-alert');
    });
  }
  closeModal();
}

function closeModal() {
  document.getElementById('killModal').style.display = 'none';
  _pendingKill = null;
}

// ── NICE ──────────────────────────────────────────────────────
function doNice(pid, name) {
  niceProcess(pid).then(() => {
    addLog(`Reniced "${name}" (PID ${pid}) — CPU priority lowered`, 'log-nice');
    tick(); // force refresh
  }).catch(err => {
    addLog(`Failed to nice "${name}": ${err.message}`, 'log-alert');
  });
}

// ── DETAIL MODAL ──────────────────────────────────────────────
function showDetail(pid) {
  const p = (lastProcs || []).find(x => x.pid === pid);
  if (!p) return;
  document.getElementById('detailTitle').textContent = `Process: ${p.name}`;
  document.getElementById('detailGrid').innerHTML = [
    ['PID',         p.pid],
    ['Name',        p.name],
    ['Status',      p.status.toUpperCase()],
    ['User',        p.user],
    ['CPU Usage',   p.cpu.toFixed(2) + '%'],
    ['Memory',      p.mem.toFixed(2) + '%'],
    ['Threads',     p.threads],
    ['Priority',    p.priority],
    ['Age',         fmtAge(p.age)],
    ['Est. RAM',    (p.mem / 100 * 16384).toFixed(0) + ' MB'],
  ].map(([k, v]) => `
    <div class="detail-item">
      <div class="detail-key">${k}</div>
      <div class="detail-val">${v}</div>
    </div>`).join('');
  document.getElementById('detailModal').style.display = 'flex';
}

function closeDetailModal() {
  document.getElementById('detailModal').style.display = 'none';
}

// Close modals on overlay click or Escape
document.addEventListener('click', e => {
  if (e.target.id === 'killModal')   closeModal();
  if (e.target.id === 'detailModal') closeDetailModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeDetailModal(); }
});

// ── ACTIVITY LOG ──────────────────────────────────────────────
function addLog(msg, cls = 'log-info') {
  _logCount++;
  const time = new Date().toLocaleTimeString();
  _logEntries.unshift({ msg, cls, time });
  if (_logEntries.length > 80) _logEntries.pop();
  _renderLog();
}

function _renderLog() {
  document.getElementById('logCount').textContent = _logCount + ' events';
  document.getElementById('logBody').innerHTML = _logEntries
    .slice(0, 50)
    .map(e => `<div class="log-entry ${e.cls}">[${e.time}] ${esc(e.msg)}</div>`)
    .join('');
}

function clearLog() {
  _logEntries = [];
  _logCount   = 0;
  _renderLog();
  addLog('Log cleared by administrator.', 'log-info');
}

// ── HELPERS ───────────────────────────────────────────────────
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtAge(sec) {
  if (sec < 60)   return sec + 's';
  if (sec < 3600) return Math.floor(sec / 60) + 'm ' + (sec % 60) + 's';
  return Math.floor(sec / 3600) + 'h ' + Math.floor((sec % 3600) / 60) + 'm';
}
