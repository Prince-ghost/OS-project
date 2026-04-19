"""
Real-Time Process Monitoring Dashboard - Backend
Run: python app.py
Open: http://localhost:5000
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import psutil, signal, os, time, logging

app = Flask(__name__, static_folder='.')
CORS(app)

os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    filename='logs/alerts.log', level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)

# In-memory rolling history (30 points)
_cpu_hist = [0.0] * 30
_mem_hist = [0.0] * 30


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)


@app.route('/api/processes')
def get_processes():
    procs = []
    for p in psutil.process_iter(['pid','name','status','cpu_percent','memory_percent','num_threads','username','nice']):
        try:
            i = p.info
            procs.append({
                'pid':      i['pid'],
                'name':     i['name'] or 'unknown',
                'status':   i['status'],
                'cpu':      round(i['cpu_percent'] or 0, 2),
                'mem':      round(i['memory_percent'] or 0, 2),
                'threads':  i['num_threads'] or 1,
                'user':     (i['username'] or 'unknown').split('\\')[-1],
                'priority': 'high' if (i.get('nice') or 0) < 0 else 'low' if (i.get('nice') or 0) > 5 else 'normal',
                'age':      0,
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    return jsonify(procs)


@app.route('/api/system')
def get_system():
    global _cpu_hist, _mem_hist
    cpu  = psutil.cpu_percent(interval=0.1)
    mem  = psutil.virtual_memory()
    swap = psutil.swap_memory()

    # Maintain rolling window of 30 samples
    _cpu_hist = _cpu_hist[1:] + [round(cpu, 2)]
    _mem_hist = _mem_hist[1:] + [round(mem.percent, 2)]

    uptime  = int(time.time() - psutil.boot_time())
    all_p   = list(psutil.process_iter(['status']))
    statuses = [p.info.get('status','') for p in all_p]

    try:
        load = psutil.getloadavg()
    except AttributeError:
        load = (0.0, 0.0, 0.0)   # Windows fallback

    return jsonify({
        'cpu_percent':   round(cpu, 2),
        'mem_percent':   round(mem.percent, 2),
        'mem_used_gb':   round(mem.used / (1024**3), 2),
        'mem_total_gb':  round(mem.total / (1024**3), 2),
        'swap_percent':  round(swap.percent, 2),
        'uptime_seconds': uptime,
        'total_procs':   len(all_p),
        'running':       statuses.count('running'),
        'sleeping':      statuses.count('sleeping'),
        'zombie':        statuses.count('zombie'),
        'stopped':       statuses.count('stopped'),
        'load_1':        round(load[0], 2),
        'load_5':        round(load[1], 2),
        'load_15':       round(load[2], 2),
        'cpu_history':   _cpu_hist,   # always exactly 30 items
        'mem_history':   _mem_hist,
        'core_count':    psutil.cpu_count(logical=True),
    })


@app.route('/api/kill/<int:pid>', methods=['POST'])
def kill_process(pid):
    try:
        proc = psutil.Process(pid)
        name = proc.name()
        proc.kill()
        logging.warning(f'KILL: {name} (PID {pid})')
        return jsonify({'status': 'killed', 'pid': pid, 'name': name})
    except psutil.NoSuchProcess:
        return jsonify({'error': 'Process not found'}), 404
    except psutil.AccessDenied:
        return jsonify({'error': 'Permission denied — run as admin/sudo'}), 403
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/nice/<int:pid>', methods=['POST'])
def nice_process(pid):
    try:
        proc = psutil.Process(pid)
        name = proc.name()
        current = proc.nice()
        proc.nice(min(current + 5, 19))
        logging.info(f'NICE: {name} (PID {pid}) {current} -> {current+5}')
        return jsonify({'status': 'reniced', 'pid': pid, 'name': name})
    except psutil.AccessDenied:
        return jsonify({'error': 'Permission denied'}), 403
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/log-alert', methods=['POST'])
def log_alert():
    msg = (request.json or {}).get('message', '')
    logging.warning(f'ALERT: {msg}')
    return jsonify({'logged': True})


if __name__ == '__main__':
    print('\n' + '='*50)
    print('  Real-Time Process Monitor - Backend')
    print('  Open: http://localhost:5000')
    print('='*50 + '\n')
    app.run(debug=True, port=5000, threaded=True)
