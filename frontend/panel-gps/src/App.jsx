import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Corrección de los íconos de Leaflet en React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function App() {
  const [registros, setRegistros] = useState([]);

  useEffect(() => {
    // Llamada a tu servidor local de Node.js
    fetch('http://localhost:3000/api/telemetry')
      .then(res => res.json())
      .then(data => setRegistros(data))
      .catch(err => console.error("Error cargando datos: ", err));
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Control de Activos de TI en Planta</h1>
      
      {/* Contenedor del Mapa */}
      <div style={{ height: '500px', width: '100%', marginBottom: '20px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ccc' }}>
        <MapContainer center={[20.5881, -100.3899]} zoom={5} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          
          {registros.map((reg) => (
            // Solo graficamos si hay coordenadas válidas
            reg.ubicacion.lat !== 0 && (
              <Marker key={reg._id} position={[reg.ubicacion.lat, reg.ubicacion.lng]}>
                <Popup>
                  <strong>Equipo:</strong> {reg.equipo_id} <br />
                  <strong>Evento:</strong> {reg.evento} <br />
                  <strong>Fecha:</strong> {new Date(reg.offline_timestamp).toLocaleString()}
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>
      </div>

      {/* Tabla de Auditoría */}
      <h2>Auditoría de Eventos Recientes</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f4', borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: '10px' }}>Equipo</th>
            <th style={{ padding: '10px' }}>Evento</th>
            <th style={{ padding: '10px' }}>Periféricos USB</th>
            <th style={{ padding: '10px' }}>Hora del Evento (Local)</th>
            <th style={{ padding: '10px' }}>Hora de Sincronización</th>
          </tr>
        </thead>
        <tbody>
          {registros.map((reg) => (
            <tr key={reg._id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px' }}><strong>{reg.equipo_id}</strong></td>
              <td style={{ padding: '10px' }}>{reg.evento}</td>
              <td style={{ padding: '10px', color: reg.perifericos_usb.includes('Ninguno') ? 'gray' : 'red' }}>
                {reg.perifericos_usb.join(', ')}
              </td>
              <td style={{ padding: '10px' }}>{new Date(reg.offline_timestamp).toLocaleString()}</td>
              <td style={{ padding: '10px' }}>{new Date(reg.sync_timestamp).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;