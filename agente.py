import os
import json
import time
import socket 
import tempfile
import asyncio
import requests
import datetime
import subprocess
import threading 
from winsdk.windows.devices.geolocation import Geolocator, GeolocationAccessStatus

ARCHIVO_OFFLINE = os.path.join(tempfile.gettempdir(), "datos_pendientes.json")

# Candado de seguridad
sync_lock = threading.Lock()

def obtener_ubicacion():
    print("  -> Solicitando ubicación...")
    try:
        async def fetch_windows_location():
            locator = Geolocator()
            locator.desired_accuracy = 1 
            status = await locator.request_access_async()
            if status == GeolocationAccessStatus.ALLOWED:
                pos = await locator.get_geoposition_async()
                return pos.coordinate.latitude, pos.coordinate.longitude
            return 0.0, 0.0
        
        lat, lng = asyncio.run(fetch_windows_location())
        return lat, lng
    except Exception as e:
        return 0.0, 0.0

def obtener_perifericos(silencioso=False):
    if not silencioso:
        print("  -> Escaneando dispositivos USB/COM...")
    perifericos = []
    try:
        cmd_usb = 'powershell -NoProfile -Command "Get-Disk | Select-Object FriendlyName, BusType"'
        res_usb = subprocess.run(cmd_usb, shell=True, capture_output=True, text=True, errors='ignore')
        for linea in res_usb.stdout.split('\n'):
            if "USB" in linea.upper() and "FriendlyName" not in linea:
                nombre_limpio = linea.replace("USB", "").strip()
                if nombre_limpio:
                    perifericos.append(nombre_limpio)
            
        cmd_com = 'powershell -NoProfile -Command "Get-PnpDevice -Class Ports -PresentOnly | Select-Object FriendlyName"'
        res_com = subprocess.run(cmd_com, shell=True, capture_output=True, text=True, errors='ignore')
        for linea in res_com.stdout.split('\n'):
            if "(COM" in linea.upper() and "FriendlyName" not in linea:
                nombre_limpio = linea.strip()
                if nombre_limpio:
                    perifericos.append(nombre_limpio)
        return perifericos
    except:
        return []

def guardar_offline(evento):
    pendientes = []
    if os.path.exists(ARCHIVO_OFFLINE):
        try:
            with open(ARCHIVO_OFFLINE, "r") as f:
                pendientes = json.load(f)
        except:
            pass
    pendientes.append(evento)
    with open(ARCHIVO_OFFLINE, "w") as f:
        json.dump(pendientes, f)
    print(f"  -> [OFFLINE] Dato guardado localmente. Pendientes: {len(pendientes)}")

def cargar_pendientes():
    if os.path.exists(ARCHIVO_OFFLINE):
        try:
            with open(ARCHIVO_OFFLINE, "r") as f:
                return json.load(f)
        except:
            return []
    return []

def sincronizar_con_servidor(tipo_evento="Reporte de rutina"):
    with sync_lock: 
        print(f"\n--- Ejecutando: {tipo_evento} ---")
        lat, lng = obtener_ubicacion()
        perifericos_conectados = obtener_perifericos(silencioso=True)
        nombre_computadora = socket.gethostname() 
        
        evento_actual = {
            "equipo_id": nombre_computadora, 
            "evento": tipo_evento,
            "ubicacion": {"lat": lat, "lng": lng},
            "perifericos_usb": perifericos_conectados,
            "offline_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        
        paquete_a_enviar = cargar_pendientes()
        paquete_a_enviar.append(evento_actual)
        
        try:
            response = requests.post("https://inn-telemetria.onrender.com/api/telemetry", json=paquete_a_enviar, timeout=15)
            if response.status_code == 200:
                print(f"  -> [+] Éxito. Enviados {len(paquete_a_enviar)} registros.")
                if os.path.exists(ARCHIVO_OFFLINE):
                    os.remove(ARCHIVO_OFFLINE)
            else:
                print(f"  -> [-] Error del servidor. Guardando en caché.")
                guardar_offline(evento_actual)
        except:
            guardar_offline(evento_actual)

# 2. EL HILO VIGILANTE (Estrategia Fotográfica - Sin WMI)
def vigilante_usb():
    # Tomamos la foto inicial de lo que está conectado
    lista_conocida = obtener_perifericos(silencioso=True)
    
    while True:
        time.sleep(10) # El vigilante revisa cada 10 segundos
        
        # Tomamos una foto actual
        lista_actual = obtener_perifericos(silencioso=True)
        
        # Comparamos si hay alguna diferencia entre las dos fotos
        if set(lista_conocida) != set(lista_actual):
            print("\n  -> [!] ALERTA: Hardware conectado/desconectado detectado en tiempo real.")
            sincronizar_con_servidor(tipo_evento="Alerta: Dispositivo USB modificado")
            
            # Actualizamos nuestra foto de referencia
            lista_conocida = lista_actual


# 3. BLOQUE PRINCIPAL
if __name__ == '__main__':
    print("--- INICIANDO AGENTE CON PROTECCIÓN EN TIEMPO REAL (VERSIÓN ESTABLE) ---")
    
    # Arrancamos al guardia de seguridad en segundo plano
    hilo_seguridad = threading.Thread(target=vigilante_usb, daemon=True)
    hilo_seguridad.start()
    
    # Reporte inicial
    sincronizar_con_servidor(tipo_evento="Arranque del sistema / Reinicio")
    
    # Ciclo normal (Para la rutina y suspensión)
    while True:
        segundos_espera = 3600 # 1 hora
        tiempo_inicio = time.time()
        ultimo_chequeo = tiempo_inicio
        se_suspendio = False
        
        while (time.time() - tiempo_inicio) < segundos_espera:
            time.sleep(10) 
            ahora = time.time()
            if (ahora - ultimo_chequeo) > 60:
                se_suspendio = True
                break 
            ultimo_chequeo = ahora
            
        if se_suspendio:
            sincronizar_con_servidor(tipo_evento="Reactivación tras suspensión")
        else:
            sincronizar_con_servidor(tipo_evento="Reporte de rutina (1 hora)")