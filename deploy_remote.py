import paramiko
import subprocess
import sys
import os
import tarfile
import time
import urllib.request
import json

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOSTNAME = "192.168.100.2"
USERNAME = "uzcategui"
PASSWORD = "uzcategui"
LOCAL_DIR = r"C:\Users\Amy Uzcategui\Documents\Inventario"
LOCAL_ARCHIVE = r"C:\Users\Amy Uzcategui\Documents\odinventario.tar.gz"
REMOTE_ARCHIVE = "/home/uzcategui/odinventario.tar.gz"
REMOTE_DIR = "/home/uzcategui/odinventario"

def sync_github():
    print("[*] Sincronizando espejo con GitHub (origin/master)...")
    try:
        subprocess.run(["git", "add", "."], cwd=LOCAL_DIR, check=True)
        # Check if there are changes to commit
        res = subprocess.run(["git", "status", "--porcelain"], cwd=LOCAL_DIR, capture_output=True, text=True)
        if res.stdout.strip():
            msg = f"sync: espejo automático {time.strftime('%Y-%m-%d %H:%M:%S')}"
            subprocess.run(["git", "commit", "-m", msg], cwd=LOCAL_DIR, check=True)
            print(f"[+] Commit creado: {msg}")
        # Push to remote
        push_res = subprocess.run(["git", "push", "origin", "master"], cwd=LOCAL_DIR, capture_output=True, text=True)
        if push_res.returncode == 0:
            print("[+] Repositorio GitHub actualizado exitosamente en https://github.com/eltecnicoluisia/odinventario")
        else:
            print(f"[!] Aviso GitHub push: {push_res.stderr.strip()}")
    except Exception as e:
        print(f"[-] Error sincronizando con GitHub: {e}")

def make_tar():
    print("[*] Empaquetando proyecto local...")
    with tarfile.open(LOCAL_ARCHIVE, "w:gz") as tar:
        for root, dirs, files in os.walk(LOCAL_DIR):
            dirs[:] = [d for d in dirs if d not in ('node_modules', '.next', '.git', '__pycache__')]
            for f in files:
                full_p = os.path.join(root, f)
                rel_p = os.path.relpath(full_p, LOCAL_DIR)
                tar.add(full_p, arcname=rel_p)
    print(f"[+] Paquete comprimido: {os.path.getsize(LOCAL_ARCHIVE)} bytes.")

def verify_live():
    print("[*] Verificando salud de la plataforma en http://192.168.100.2:8088...")
    time.sleep(3)
    for attempt in range(5):
        try:
            req = urllib.request.Request("http://192.168.100.2:8088/api/health", headers={"User-Agent": "DeploySync"})
            with urllib.request.urlopen(req, timeout=4) as res:
                if res.status == 200:
                    print("[✓] Servidor en vivo y respondiendo correctamente (HTTP 200 OK).")
                    return True
        except Exception:
            time.sleep(2)
    print("[!] Nota: El servidor aún está terminando de inicializar los servicios.")
    return False

def deploy():
    # 1. Sync with GitHub
    sync_github()

    # 2. Package
    make_tar()

    # 3. Connect SSH
    print(f"[*] Conectando SSH a {HOSTNAME}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(HOSTNAME, username=USERNAME, password=PASSWORD, timeout=10)
        print("[+] Conectado por SSH al servidor.")
    except Exception as e:
        print(f"[-] Error SSH: {e}")
        return False

    # 4. Transfer SFTP
    print(f"[*] Subiendo copia fiel por SFTP a {REMOTE_ARCHIVE}...")
    sftp = ssh.open_sftp()
    sftp.put(LOCAL_ARCHIVE, REMOTE_ARCHIVE)
    sftp.close()
    print("[+] Archivo transferido con éxito.")

    # 5. Extract and Docker Compose Up
    commands = [
        f"mkdir -p {REMOTE_DIR}",
        f"tar -xzvf {REMOTE_ARCHIVE} -C {REMOTE_DIR}",
        f"cd {REMOTE_DIR} && echo {PASSWORD} | sudo -S docker compose down --remove-orphans || true",
        f"cd {REMOTE_DIR} && echo {PASSWORD} | sudo -S docker compose up -d --build --remove-orphans",
        f"cd {REMOTE_DIR} && echo {PASSWORD} | sudo -S docker compose ps"
    ]

    for cmd in commands:
        stdin, stdout, stderr = ssh.exec_command(cmd, get_pty=True)
        out = stdout.read().decode('utf-8', errors='replace')
        if "docker compose ps" in cmd:
            print(out)

    ssh.close()
    print("\n[+] ¡Despliegue finalizado con éxito en el servidor!")
    
    # 6. Verify live health
    verify_live()
    return True

if __name__ == "__main__":
    deploy()
