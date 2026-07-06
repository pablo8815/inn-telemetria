import time
import asyncio
import requests
import datetime
import subprocess
from winsdk.windows.devices.geolocation import Geolocator, GeolocationAccessStatus

# 1. Función de ubicación
def obtener_ubicacion():
    print("  -> Solicitando ubicación de alta precisión a Windows...")
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
        print(f"  -> Error con sensor Windows: {e}")
        return 0.0, 0.0

# 2. Función para detectar USBs y PLCs
def obtener_perifericos():
    print("  -> Escaneando puertos y dispositivos USB...")
    cmd = 'powershell "Get-PnpDevice -PresentOnly | Where-Object { $_.InstanceId -match \'^USB\' -or $_.Class -eq \'Ports\' } | Select-Object -ExpandProperty FriendlyName"'
    try:
        salida = subprocess.check_output(cmd, shell=True, text=True, encoding='cp850', errors='ignore')
        dispositivos = [linea.strip() for linea in salida.split('\n') if linea.strip()]
        lista_limpia = [d for d in dispositivos if d and "Concentrador raíz" not in d and "Root Hub" not in d]
        
        # DEBUG: Imprimir aquí lo que detecta antes de enviarlo
        print(f"  -> [DEBUG] Periféricos encontrados: {lista_limpia}")
        
        return lista_limpia
    except Exception as e:
        print(f"  -> Error al leer puertos: {e}")
        return []

# 3. Función de sincronización
def sincronizar_con_servidor():
    print("  -> Intentando sincronizar...")
    lat, lng = obtener_ubicacion()
    perifericos_conectados = obtener_perifericos()
    
    # Incluso si no hay GPS, enviamos los periféricos si lat es 0.0? 
    # (Si solo quieres enviar si hay GPS, deja el 'if' como está)
    evento_data = {
        "equipo_id": "INN-L28",
        "evento": "Ubicación detectada",
        "ubicacion": {"lat": lat, "lng": lng},
        "perifericos": perifericos_conectados,
        "offline_timestamp": datetime.datetime.now().isoformat()
    }
    
    try:
        response = requests.post("http://localhost:3000/api/telemetry", json=[evento_data], timeout=5)
        if response.status_code == 200:
            print("  -> [+] Sincronización exitosa con periféricos incluidos.")
        else:
            print(f"  -> [-] Error del servidor {response.status_code}: {response.text}")
    except Exception as e:
        print(f"  -> Error al conectar con el servidor: {e}")

# 4. Bloque principal (Ahora todo está definido arriba)
if __name__ == '__main__':
    print("--- INICIANDO AGENTE ---")
    
    while True:
        sincronizar_con_servidor()
        print("El agente está activo, esperando...")
        time.sleep(3600) # 5 minutos es un buen tiempo para no saturar