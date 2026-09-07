import paramiko
import sys
import os
import tarfile

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOSTNAME = "192.168.100.2"
USERNAME = "uzcategui"
PASSWORD = "uzcategui"
LOCAL_DIR = r"C:\Users\Amy Uzcategui\Documents\Inventario"
LOCAL_ARCHIVE = r"C:\Users\Amy Uzcategui\Documents\odinventario.tar.gz"
REMOTE_ARCHIVE = "/home/uzcategui/odinventario.tar.gz"
REMOTE_DIR = "/home/uzcategui/odinventario"

def make_tar():
    print("[*] Empaquetando proyecto...")
    with tarfile.open(LOCAL_ARCHIVE, "w:gz") as tar:
        for root, dirs, files in os.walk(LOCAL_DIR):
            dirs[:] = [d for d in dirs if d not in ('node_modules', '.next', '.git', '__pycache__')]
            for f in files:
                full_p = os.path.join(root, f)
                rel_p = os.path.relpath(full_p, LOCAL_DIR)
                tar.add(full_p, arcname=rel_p)
    print(f"[+] Archivo empaquetado: {os.path.getsize(LOCAL_ARCHIVE)} bytes.")

def deploy():
    make_tar()
    print(f"[*] Conectando SSH a {HOSTNAME}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(HOSTNAME, username=USERNAME, password=PASSWORD, timeout=10)
        print("[+] Conectado por SSH.")
    except Exception as e:
        print(f"[-] Error SSH: {e}")
        return False

    print(f"[*] Subiendo paquete por SFTP a {REMOTE_ARCHIVE}...")
    sftp = ssh.open_sftp()
    sftp.put(LOCAL_ARCHIVE, REMOTE_ARCHIVE)
    sftp.close()
    print("[+] Paquete transferido con éxito.")

    commands = [
        f"mkdir -p {REMOTE_DIR}",
        f"tar -xzvf {REMOTE_ARCHIVE} -C {REMOTE_DIR}",
        f"cd {REMOTE_DIR} && echo {PASSWORD} | sudo -S docker compose down --remove-orphans || true",
        f"cd {REMOTE_DIR} && echo {PASSWORD} | sudo -S docker compose up -d --remove-orphans",
        f"cd {REMOTE_DIR} && echo {PASSWORD} | sudo -S docker compose ps"
    ]

    for cmd in commands:
        print(f"\n[*] Ejecutando en servidor: {cmd.split('&&')[-1].strip()}")
        stdin, stdout, stderr = ssh.exec_command(cmd, get_pty=True)
        out = stdout.read().decode('utf-8', errors='replace')
        if out:
            print(out)

    ssh.close()
    print("\n[+] ¡Despliegue finalizado con éxito en el servidor!")
    return True

if __name__ == "__main__":
    deploy()
