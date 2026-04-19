# OS Project - Process Monitor Dashboard

This is my OS subject project. I made a real-time process monitoring dashboard that shows CPU usage, memory, and running processes on your system.

---

## What this does

- Shows live CPU and memory usage with graphs
- Lists all running processes with their PID, CPU%, memory usage and status
- You can kill a process or change its priority (renice) directly from the dashboard
- Shows alerts when CPU goes above 80% or if a zombie process is found
- Has an activity log that records everything with timestamps
- Refresh rate can be adjusted or paused anytime

---

## How to run

### Simple way (no install needed)
Just open `index.html` in your browser. It will run with simulated data.

If you have VS Code, install the **Live Server** extension and right-click `index.html` → Open with Live Server.

### With real system data (Python needed)
```bash
pip install flask flask-cors psutil

python app.py
```
Then open `http://localhost:5000` in your browser.

---

## Files in this project

```
OS-project/
├── index.html          - main dashboard page
├── app.py              - python backend (flask)
├── requirements.txt    - python packages needed
├── css/
│   └── style.css       - styling and dark theme
├── js/
│   ├── app.js          - main logic
│   ├── charts.js       - graphs
│   ├── data.js         - data handling
│   └── processes.js    - process table and controls
└── README.md
```

---

## Technologies used

- HTML, CSS, JavaScript (frontend)
- Python with Flask (backend)
- Chart.js (for graphs)
- psutil library (to get real system data)

---

## Bug I fixed

Earlier the chart data kept growing forever which made the graph weird. Fixed it by using a rolling window of 30 data points:

```js
// before (wrong)
cpuHistory.push(newValue);

// after (fixed)
cpuHistory.shift();
cpuHistory.push(newValue);
```

---

Made for CA2 - Operating Systems
