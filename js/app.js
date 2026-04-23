// ── MAIN APP CONTROLLER ───────────────────────────────────────
const CPU_ALERT  = 80;
const MEM_ALERT  = 85;

let _paused    = false;
let _intervalId = null;
let _refreshMs = 2000;
let _tickCount = 0;
let _lastAlert = '';
let lastProcs = []; // Global list of processes for filtering and modals

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCharts();
  tick();
  _startInterval();
  setInterval(updateClock, 1000);
  addLog('Process Monitor started. Refresh: ' + (_refreshMs / 1000) + 's', 'log-success');
});

// ── MAIN TICK ─────────────────────────────────────────────────
async function tick() {
  if (_paused) return;
  _tickCount++;

  try {
    const sys = await getSystemMetrics();
    const procs = await getProcesses();
    lastProcs = procs;

    _updateCards(sys);
    updateCharts(sys.cpu_history, sys.mem_history);
    _updateLoadBars(sys);
    renderTable(procs);
    _checkAlerts(sys);

    if (_tickCount % 12 === 0) {
      addLog(
        `Poll #${_tickCount} — CPU: ${sys.cpu_percent.toFixed(1)}% | MEM: ${sys.mem_percent.toFixed(1)}%`,
        'log-info'
      );
    }
  } catch (err) {
    console.error("API Fetch Error:", err);
    document.getElementById('mCpu').textContent = 'ERR';
  }
}

// ── METRIC CARDS ─────────────────────────────────────────────
function _updateCards(sys) {
  const cpu = sys.cpu_percent;
  const mem = sys.mem_percent;

  document.getElementById('mCpu').textContent       = cpu.toFixed(1) + '%';
  document.getElementById('mCpuSub').textContent    = sys.core_count + ' logical cores';
  document.getElementById('cpuCurrent').textContent = cpu.toFixed(1) + '%';
  document.getElementById('card-cpu').classList.toggle('high', cpu > CPU_ALERT);
  updateRing('ringCpu', cpu);

  document.getElementById('mMem').textContent       = mem.toFixed(1) + '%';
  document.getElementById('mMemSub').textContent    = sys.mem_used_gb + ' of ' + sys.mem_total_gb + ' GB';
  document.getElementById('memCurrent').textContent = mem.toFixed(1) + '%';
  document.getElementById('card-mem').classList.toggle('high', mem > MEM_ALERT);
  updateRing('ringMem', mem);

  document.getElementById('mProcs').textContent    = sys.total_procs;
  document.getElementById('mProcsSub').textContent = sys.running + ' running · ' + sys.sleeping + ' sleeping';

  document.getElementById('mUptime').textContent   = _fmtUptime(sys.uptime_seconds);

  document.getElementById('mSwap').textContent     = sys.swap_percent.toFixed(1) + '%';

  const anom = sys.zombie + sys.stopped;
  document.getElementById('mZombie').textContent    = anom;
  document.getElementById('mZombieSub').textContent = sys.zombie + ' zombie · ' + sys.stopped + ' stopped';
  document.getElementById('mZombie').style.color    = anom > 0 ? 'var(--red)' : '';
}

// ── LOAD BARS ─────────────────────────────────────────────────
function _updateLoadBars(sys) {
  const maxLoad = sys.core_count * 1.5;
  const pct = v => Math.min(100, (v / maxLoad) * 100).toFixed(1) + '%';

  document.getElementById('load1').textContent      = sys.load_1;
  document.getElementById('load5').textContent      = sys.load_5;
  document.getElementById('load15').textContent     = sys.load_15;
  document.getElementById('load1bar').style.width   = pct(sys.load_1);
  document.getElementById('load5bar').style.width   = pct(sys.load_5);
  document.getElementById('load15bar').style.width  = pct(sys.load_15);
  document.getElementById('coreInfo').textContent   =
    sys.core_count + ' cores · Load avg: ' + sys.load_1 + ' / ' + sys.load_5 + ' / ' + sys.load_15 + ' (1m / 5m / 15m)';
}

// ── ALERTS ────────────────────────────────────────────────────
function _checkAlerts(sys) {
  const msgs = [];
  if (sys.cpu_percent > CPU_ALERT) msgs.push('⚡ High CPU: ' + sys.cpu_percent.toFixed(1) + '%');
  if (sys.mem_percent > MEM_ALERT) msgs.push('💾 High Memory: ' + sys.mem_percent.toFixed(1) + '%');
  if (sys.zombie > 0)              msgs.push('💀 ' + sys.zombie + ' zombie process(es) detected');

  const banner = document.getElementById('alertBanner');
  if (msgs.length > 0) {
    const msg = msgs.join('   |   ');
    banner.style.display = 'flex';
    document.getElementById('alertText').textContent = msg;
    if (msg !== _lastAlert) { addLog('ALERT: ' + msg, 'log-alert'); _lastAlert = msg; }
  } else {
    banner.style.display = 'none';
    _lastAlert = '';
  }
}

// ── CONTROLS ──────────────────────────────────────────────────
function togglePause() {
  _paused = !_paused;
  const btn = document.getElementById('btnPause');
  btn.textContent = _paused ? '▶ Resume' : '⏸ Pause';
  btn.classList.toggle('paused', _paused);
  if (!_paused) tick();
  addLog(_paused ? 'Monitor paused.' : 'Monitor resumed.', 'log-info');
}

function changeRefresh(val) {
  _refreshMs = parseInt(val, 10);
  _startInterval();
  addLog('Refresh rate changed to ' + (_refreshMs / 1000) + 's', 'log-info');
}

function _startInterval() {
  if (_intervalId) clearInterval(_intervalId);
  _intervalId = setInterval(tick, _refreshMs);
}

// ── CLOCK ─────────────────────────────────────────────────────
function updateClock() {
  document.getElementById('navTime').textContent = new Date().toLocaleTimeString();
}

// ── HELPERS ───────────────────────────────────────────────────
function _fmtUptime(sec) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return d + 'd ' + h + 'h ' + m + 'm';
  if (h > 0) return h + 'h ' + m + 'm';
  return m + 'm ' + (sec % 60) + 's';
}
