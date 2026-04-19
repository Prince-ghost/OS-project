// ── CONSTANTS ────────────────────────────────────────────────
const MAX_HISTORY = 30;   // chart window size — NEVER grows beyond this

// ── PROCESS TEMPLATES ────────────────────────────────────────
const TEMPLATES = [
  { name: 'systemd',       user: 'root',     bc: 0.1,  bm: 0.3,  th: 1  },
  { name: 'chrome',        user: 'user',     bc: 8.5,  bm: 12.4, th: 28 },
  { name: 'node',          user: 'user',     bc: 4.2,  bm: 6.1,  th: 8  },
  { name: 'python3',       user: 'user',     bc: 2.1,  bm: 3.4,  th: 3  },
  { name: 'postgres',      user: 'postgres', bc: 1.5,  bm: 4.8,  th: 12 },
  { name: 'nginx',         user: 'www-data', bc: 0.5,  bm: 1.2,  th: 4  },
  { name: 'java',          user: 'user',     bc: 6.8,  bm: 18.2, th: 32 },
  { name: 'sshd',          user: 'root',     bc: 0.0,  bm: 0.2,  th: 1  },
  { name: 'bash',          user: 'user',     bc: 0.1,  bm: 0.1,  th: 1  },
  { name: 'dockerd',       user: 'root',     bc: 1.2,  bm: 3.6,  th: 14 },
  { name: 'redis-server',  user: 'redis',    bc: 0.8,  bm: 1.1,  th: 4  },
  { name: 'mongod',        user: 'mongodb',  bc: 2.4,  bm: 8.3,  th: 24 },
  { name: 'mysql',         user: 'mysql',    bc: 1.9,  bm: 5.6,  th: 16 },
  { name: 'webpack',       user: 'user',     bc: 12.4, bm: 9.2,  th: 4  },
  { name: 'vscode',        user: 'user',     bc: 3.5,  bm: 7.4,  th: 20 },
  { name: 'eslint',        user: 'user',     bc: 3.2,  bm: 2.1,  th: 2  },
  { name: 'git',           user: 'user',     bc: 0.5,  bm: 0.4,  th: 1  },
  { name: 'cron',          user: 'root',     bc: 0.0,  bm: 0.1,  th: 1  },
  { name: 'NetworkManager',user: 'root',     bc: 0.1,  bm: 0.5,  th: 3  },
  { name: 'Xorg',          user: 'root',     bc: 1.8,  bm: 2.6,  th: 2  },
];

// ── FIXED-SIZE ROLLING ARRAYS ─────────────────────────────────
// These arrays are always exactly MAX_HISTORY items long.
// We use shift()+push() to add new values — old ones drop off.
let cpuHistory = Array(MAX_HISTORY).fill(0).map(() => 10 + Math.random() * 30);
let memHistory = Array(MAX_HISTORY).fill(0).map(() => 40 + Math.random() * 15);

// ── STATE ─────────────────────────────────────────────────────
let _processes    = [];
let _uptimeSecs   = 14400 + Math.floor(Math.random() * 3600);
let _load         = { l1: 1.2, l5: 0.9, l15: 0.7 };

// ── INIT PROCESSES ────────────────────────────────────────────
function _initProcesses() {
  _processes = TEMPLATES.map((t, i) => ({
    pid:      1000 + i * 41 + Math.floor(Math.random() * 20),
    name:     t.name,
    user:     t.user,
    threads:  t.th,
    alive:    true,
    age:      Math.floor(Math.random() * 86400),
    cpu:      Math.max(0, t.bc + (Math.random() - 0.5) * 2),
    mem:      Math.max(0, t.bm + (Math.random() - 0.5) * 1),
    status:   Math.random() > 0.78 ? 'sleeping' : 'running',
    priority: t.bc > 8 ? 'high' : t.bc < 0.2 ? 'low' : 'normal',
  }));
  // Randomly add a zombie process
  if (Math.random() > 0.65) {
    _processes[Math.floor(Math.random() * 4) + 15].status = 'zombie';
  }
}
_initProcesses();

// ── PUBLIC: getters ────────────────────────────────────────────
function getProcesses() {
  return _processes.filter(p => p.alive);
}

function getSystemMetrics() {
  const alive = getProcesses();
  return {
    cpu_percent:    cpuHistory[cpuHistory.length - 1],
    mem_percent:    memHistory[memHistory.length - 1],
    mem_used_gb:    +(memHistory[memHistory.length - 1] / 100 * 16).toFixed(2),
    mem_total_gb:   16,
    swap_percent:   +(memHistory[memHistory.length - 1] * 0.12).toFixed(1),
    uptime_seconds: _uptimeSecs,
    total_procs:    alive.length,
    running:        alive.filter(p => p.status === 'running').length,
    sleeping:       alive.filter(p => p.status === 'sleeping').length,
    zombie:         alive.filter(p => p.status === 'zombie').length,
    stopped:        alive.filter(p => p.status === 'stopped').length,
    load_1:         +_load.l1.toFixed(2),
    load_5:         +_load.l5.toFixed(2),
    load_15:        +_load.l15.toFixed(2),
    // Return COPIES of fixed-size arrays — chart always gets exactly MAX_HISTORY points
    cpu_history:    [...cpuHistory],
    mem_history:    [...memHistory],
    core_count:     navigator.hardwareConcurrency || 4,
  };
}

// ── PUBLIC: actions ────────────────────────────────────────────
function killProcess(pid) {
  const p = _processes.find(x => x.pid === pid);
  if (!p || !p.alive) return false;
  p.alive = false;
  return true;
}

function niceProcess(pid) {
  const p = _processes.find(x => x.pid === pid);
  if (!p || !p.alive) return false;
  p.cpu = Math.max(0.1, p.cpu * 0.55);
  p.priority = 'low';
  return true;
}

// ── TICK: called every interval ───────────────────────────────
// THE FIX: shift() removes the oldest value, push() adds the newest.
// Array length stays exactly MAX_HISTORY — never grows.
function tickData() {
  _uptimeSecs++;

  // CPU rolling window — always MAX_HISTORY items
  const lastCpu = cpuHistory[cpuHistory.length - 1];
  const newCpu  = Math.min(98, Math.max(3, lastCpu + (Math.random() - 0.47) * 10));
  cpuHistory.shift();   // remove oldest (index 0)
  cpuHistory.push(newCpu); // add newest at end

  // Memory rolling window — always MAX_HISTORY items
  const lastMem = memHistory[memHistory.length - 1];
  const newMem  = Math.min(94, Math.max(25, lastMem + (Math.random() - 0.49) * 2));
  memHistory.shift();
  memHistory.push(newMem);

  // Load averages drift slowly
  _load.l1  = Math.max(0.1, Math.min(8, _load.l1  + (Math.random() - 0.49) * 0.25));
  _load.l5  = Math.max(0.1, Math.min(6, _load.l5  + (Math.random() - 0.49) * 0.12));
  _load.l15 = Math.max(0.1, Math.min(5, _load.l15 + (Math.random() - 0.49) * 0.06));

  // Update each process metrics
  _processes.forEach(p => {
    if (!p.alive) return;
    p.cpu = Math.max(0, Math.min(99, p.cpu + (Math.random() - 0.5) * 5));
    p.mem = Math.max(0.1, Math.min(30, p.mem + (Math.random() - 0.5) * 0.4));
    p.age++;
    if (p.status === 'running'  && Math.random() > 0.96) p.status = 'sleeping';
    if (p.status === 'sleeping' && Math.random() > 0.94) p.status = 'running';
  });
}
