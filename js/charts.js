// ── CHARTS MODULE ─────────────────────────────────────────────
// Uses a fixed-length labels array that NEVER changes.
// Only dataset.data is replaced each tick — with a copy of the
// rolling history array, which is always exactly MAX_HISTORY long.

let cpuChart, memChart;

function initCharts() {
  // Fixed labels array — same length as MAX_HISTORY, never modified
  const fixedLabels = Array(MAX_HISTORY).fill('');

  const sharedOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 350 },
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index', intersect: false,
        backgroundColor: '#161b22',
        borderColor: '#30363d', borderWidth: 1,
        titleColor: '#8b949e', bodyColor: '#e6edf3',
        callbacks: { label: ctx => ` ${ctx.parsed.y.toFixed(1)}%` }
      }
    },
    scales: {
      x: { display: false },
      y: {
        min: 0, max: 100,
        display: true,
        grid: { color: 'rgba(48,54,61,0.5)', drawBorder: false },
        ticks: {
          color: '#6e7681',
          font: { size: 10 },
          maxTicksLimit: 4,
          callback: v => v + '%'
        }
      }
    },
    elements: {
      point: { radius: 0 },
      line:  { tension: 0.35, borderWidth: 2 }
    }
  };

  cpuChart = new Chart(document.getElementById('cpuChart'), {
    type: 'line',
    data: {
      labels: fixedLabels,             // fixed-length, never grows
      datasets: [{
        data: [...cpuHistory],         // copy of rolling array
        borderColor: '#2188ff',
        backgroundColor: 'rgba(33,136,255,0.08)',
        fill: true,
      }]
    },
    options: sharedOptions
  });

  memChart = new Chart(document.getElementById('memChart'), {
    type: 'line',
    data: {
      labels: fixedLabels,             // same fixed array
      datasets: [{
        data: [...memHistory],
        borderColor: '#3fb950',
        backgroundColor: 'rgba(63,185,80,0.08)',
        fill: true,
      }]
    },
    options: { ...sharedOptions }
  });
}

// Called every tick — replaces data array (never appends to it)
function updateCharts(cpuHist, memHist) {
  if (!cpuChart || !memChart) return;

  // Replace entire data array with fresh copy of rolling window
  // Both arrays are always exactly MAX_HISTORY items — no growth
  cpuChart.data.datasets[0].data = [...cpuHist];
  memChart.data.datasets[0].data = [...memHist];

  // 'none' skips animation on data replace for smooth live feel
  cpuChart.update('none');
  memChart.update('none');
}

// Update SVG ring progress indicator
function updateRing(id, percent) {
  const el = document.getElementById(id);
  if (!el) return;
  const circumference = 175.93;
  el.style.strokeDashoffset = circumference - (percent / 100) * circumference;
}
