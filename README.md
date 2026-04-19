# Real-Time Process Monitoring Dashboard

## VS Code me kaise chalayein

### Option A — Seedha Browser mein (koi install nahi chahiye)
1. ZIP extract karo
2. `index.html` par right-click → "Open with Live Server" (VS Code extension)
   - Ya seedha double-click karke browser mein kholo
3. Done — simulated data ke saath poora dashboard chalega

### Option B — Real OS Data (Python backend)
```bash
# Terminal mein:
pip install flask flask-cors psutil

python app.py

# Browser mein kholo:
http://localhost:5000
```

## Project Structure
```
process-monitor/
├── index.html          ← Main dashboard page
├── css/
│   └── style.css       ← Dark theme, animations
├── js/
│   ├── data.js         ← Rolling window data (BUG FIXED)
│   ├── charts.js       ← Chart.js sparklines (fixed size)
│   ├── processes.js    ← Table, Kill, Nice, Filter, Sort
│   └── app.js          ← Main controller & alerts
├── app.py              ← Python Flask backend (real data)
├── requirements.txt
└── README.md
```

## Bug Fix (Rolling Window)
Pehle wali galti — chart data badhta rehta tha:
```js
cpuHistory.push(newValue);  // array grow karta tha — GALAT
```
Ab fix:
```js
cpuHistory.shift();         // purana hatao
cpuHistory.push(newValue);  // naya daalo — hamesha 30 items
```

## Features
- Live CPU & Memory ring gauges
- 30-second fixed rolling window charts
- Sortable, filterable process table
- Kill & Renice with confirmation
- Alert banner (CPU > 80%, Zombie)
- Activity log with timestamps
- Pause/Resume, adjustable refresh rate
