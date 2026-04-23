# OS Project - Process Monitor Dashboard

**🔴 Live Demo:** [https://os-project-6hrs.onrender.com](https://os-project-6hrs.onrender.com)

made this for my Operating System subject. it shows live CPU and memory usage along with all running processes on the system.

---

## what it does

- live CPU and memory graphs
- shows all running processes (PID, CPU%, memory, status)
- can kill a process or change its priority from the dashboard
- alert shows up if CPU crosses 80% or zombie process is found
- activity log with timestamps
- pause/resume option and adjustable refresh rate

---

## how to run

for real system data you need python:

```
pip install -r requirements.txt
python app.py
```

then go to `http://localhost:5000`

---

## project files

```
OS-project/
├── index.html
├── app.py
├── requirements.txt
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── charts.js
│   ├── data.js
│   └── processes.js
└── README.md
```

---

## tools used

- HTML, CSS, JS
- Python (Flask)
- Chart.js
- psutil
