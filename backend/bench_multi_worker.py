import subprocess
import time
import sys
import os
import requests

def wait_for_server(url, timeout=15):
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = requests.get(url, timeout=1)
            if r.status_code in (200, 404):
                return True
        except Exception:
            time.sleep(0.3)
    return False

def test_workers(workers_count, port=8008):
    env = os.environ.copy()
    env["PYTHONPATH"] = "."
    cmd = [
        sys.executable, "-m", "uvicorn", "app.main:app",
        "--host", "127.0.0.1",
        "--port", str(port),
        "--workers", str(workers_count),
        "--log-level", "warning"
    ]
    proc = subprocess.Popen(cmd, cwd=os.path.join(os.path.dirname(__file__)), env=env)
    base_url = f"http://127.0.0.1:{port}"

    try:
        if not wait_for_server(f"{base_url}/health", timeout=15):
            print(f"Failed to start uvicorn with {workers_count} workers.")
            return None

        # Execute 20 requests to payment-rooms
        for _ in range(20):
            requests.get(f"{base_url}/auth/payment-rooms")

        # Query debug cache stats
        stats_resp = requests.get(f"{base_url}/debug/cache-stats")
        stats = stats_resp.json() if stats_resp.status_code == 200 else {}
        return stats
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    print("--- Testing Real uvicorn --workers 1 ---")
    stats_1 = test_workers(1, port=8008)
    print("Workers = 1 Stats:", stats_1)

    time.sleep(1)

    print("\n--- Testing Real uvicorn --workers 4 ---")
    stats_4 = test_workers(4, port=8008)
    print("Workers = 4 Stats:", stats_4)
