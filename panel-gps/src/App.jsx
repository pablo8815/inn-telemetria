import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Corrección iconos Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Componente para animar el mapa hacia la nueva coordenada seleccionada
function MoverMapa({ centro }) {
  const map = useMap();
  useEffect(() => {
    if (centro) {
      map.flyTo(centro, 16, { duration: 1.5 }); // Animación suave
    }
  }, [centro, map]);
  return null;
}

function App() {
  const [registros, setRegistros] = useState([]);
  const [equipos, setEquipos] = useState([]); // <-- NUEVO ESTADO PARA EL CATÁLOGO
  const [vista, setVista] = useState('dashboard'); 
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // 1. Cargar Historial (Para el mapa y la auditoría)
        const resTelemetria = await fetch(`https://inn-telemetria.onrender.com/api/telemetry?t=${Date.now()}`, { cache: 'no-store' });
        const dataTelemetria = await resTelemetria.json();
        if (JSON.stringify(dataTelemetria) !== JSON.stringify(registros)) {
           setRegistros(Array.isArray(dataTelemetria) ? dataTelemetria : []);
        }

        // 2. Cargar Catálogo de Equipos (Para las tarjetas principales)
        const resEquipos = await fetch(`https://inn-telemetria.onrender.com/api/equipos?t=${Date.now()}`, { cache: 'no-store' });
        const dataEquipos = await resEquipos.json();
        setEquipos(Array.isArray(dataEquipos) ? dataEquipos : []);

      } catch (err) {
        console.error("Error al cargar datos:", err);
      }
    };
    
    cargarDatos();
    const interval = setInterval(cargarDatos, 5000); // Refresca cada 5s
    return () => clearInterval(interval);
  }, [registros]);

  // Lógica para saber cuántos están "En Red" (conectados en los últimos 15 min)
  const ahora = new Date();
  const equiposEnRed = equipos.filter(eq => {
    if (!eq.ultima_conexion) return false;
    const diffMinutos = (ahora - new Date(eq.ultima_conexion)) / 1000 / 60;
    return diffMinutos < 15;
  }).length;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', backgroundColor: '#F1F5F9', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif', overflow: 'hidden' }}>
      
      {/* SIDEBAR */}
      <aside style={{ width: '260px', backgroundColor: '#1E293B', color: 'white', display: 'flex', flexDirection: 'column', boxShadow: '2px 0 5px rgba(0,0,0,0.1)', zIndex: 10 }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #334155' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#38BDF8' }}>Innovación Integral</h2>
          <span style={{ fontSize: '0.8rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px' }}>Sistemas y Control</span>
        </div>
        <nav style={{ padding: '20px 0', flexGrow: 1 }}>
          <MenuItem active={vista === 'dashboard'} onClick={() => setVista('dashboard')} icon="📊" text="Panel de Control" />
          <MenuItem active={false} icon="💻" text="Gestión de Activos" />
          <MenuItem active={false} icon="⚙️" text="Configuración" />
        </nav>
        <div style={{ padding: '20px', fontSize: '0.8rem', color: '#64748B', borderTop: '1px solid #334155' }}>
          Plataforma v1.0.0
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        <header style={{ height: '70px', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', zIndex: 5 }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#334155', fontWeight: '600' }}>
            {vista === 'dashboard' ? 'Monitor de Dispositivos Activos' : `Detalle de Activo: ${equipoSeleccionado}`}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ color: '#64748B', fontSize: '0.9rem', fontWeight: '500' }}>Ing. Pablo García</span>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#E0F2FE', color: '#0369A1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '1px solid #BAE6FD' }}>PG</div>
          </div>
        </header>

        <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
          {vista === 'dashboard' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                {/* AHORA USA EL TOTAL REAL DEL CATÁLOGO */}
                <KpiCard titulo="Total de Equipos Registrados" valor={equipos.length} color="#3B82F6" />
                <KpiCard titulo="Equipos Reportando" valor={equiposEnRed} color="#10B981" />
                <KpiCard titulo="Alertas del Sistema" valor="0" color="#EF4444" />
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '25px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#1E293B', fontSize: '1.1rem' }}>Listado de Unidades</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                  
                  {/* AHORA MAPEAMOS EL CATÁLOGO OFICIAL, NO EL HISTORIAL */}
                  {equipos.map(equipo => {
                    const ultimaConexion = equipo.ultima_conexion ? new Date(equipo.ultima_conexion) : null;
                    const diffMinutos = ultimaConexion ? (ahora - ultimaConexion) / 1000 / 60 : Infinity;
                    const enLinea = diffMinutos < 15;

                    return (
                      <div key={equipo.equipo_id} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '20px', transition: 'all 0.2s', cursor: 'pointer', backgroundColor: '#F8FAFC' }}
                           onClick={() => { setEquipoSeleccionado(equipo.equipo_id); setVista('detalle'); }}
                           onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(59,130,246,0.1)'; }}
                           onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.boxShadow = 'none'; }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                          <strong style={{ fontSize: '1.25rem', color: '#0F172A' }}>{equipo.equipo_id}</strong>
                          
                          {/* ETIQUETA DINÁMICA DE ESTADO */}
                          {enLinea ? (
                            <span style={{ background: '#DCFCE7', color: '#166534', padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #BBF7D0' }}>En red</span>
                          ) : (
                            <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #FECACA' }}>Desconectado</span>
                          )}
                        </div>
                        
                        <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '15px', marginTop: '10px' }}>
                          <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#64748B' }}>Usuario Asignado: <strong style={{ color: '#334155' }}>{equipo.usuario_asignado}</strong></p>
                          <p style={{ margin: '0', fontSize: '0.85rem', color: '#64748B' }}>Última sincronización: <strong style={{ color: '#334155' }}>{ultimaConexion ? ultimaConexion.toLocaleTimeString('es-MX') : '--'}</strong></p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
             <DashboardEquipo equipoId={equipoSeleccionado} datos={registros.filter(r => r.equipo_id === equipoSeleccionado)} onBack={() => setVista('dashboard')} />
          )}
        </div>
      </main>
    </div>
  );
}

// Botones del Menú Lateral
function MenuItem({ icon, text, active, onClick }) {
  return (
    <div onClick={onClick} style={{ padding: '12px 24px', margin: '4px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: active ? '#334155' : 'transparent', color: active ? 'white' : '#94A3B8', transition: 'all 0.2s', borderLeft: active ? '3px solid #38BDF8' : '3px solid transparent' }}>
      <span style={{ fontSize: '1.2rem', opacity: active ? 1 : 0.7 }}>{icon}</span>
      <span style={{ fontWeight: '500', fontSize: '0.95rem' }}>{text}</span>
    </div>
  );
}

// Tarjetas Superiores
function KpiCard({ titulo, valor, color }) {
  return (
    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0', borderLeft: `5px solid ${color}` }}>
      <h4 style={{ margin: '0 0 12px 0', color: '#64748B', fontWeight: '500', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{titulo}</h4>
      <span style={{ fontSize: '2.2rem', fontWeight: '700', color: '#0F172A' }}>{valor}</span>
    </div>
  );
}

// COMPONENTE DE DETALLES CON MAPA Y PERIFÉRICOS
function DashboardEquipo({ equipoId, datos, onBack }) {
  const [registroActivo, setRegistroActivo] = useState(datos[0]); 

  useEffect(() => {
    if (datos.length > 0) {
      setRegistroActivo(datos[0]);
    }
  }, [datos]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <button onClick={onBack} style={{ alignSelf: 'flex-start', background: 'white', border: '1px solid #CBD5E1', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        ← Volver al listado general
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '25px' }}>
        
        {/* COLUMNA IZQUIERDA: MAPA Y HARDWARE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* PANEL MAPA */}
          <div style={{ backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
            <div style={{ padding: '18px 25px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
              <strong style={{ color: '#1E293B', fontSize: '1.1rem' }}>Rastreo Satelital Continuo</strong>
            </div>
            <div style={{ height: '400px' }}>
              {registroActivo?.ubicacion?.lat ? (
                <MapContainer center={[registroActivo.ubicacion.lat, registroActivo.ubicacion.lng]} zoom={16} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[registroActivo.ubicacion.lat, registroActivo.ubicacion.lng]}>
                    <Popup>{equipoId} - {new Date(registroActivo.offline_timestamp).toLocaleTimeString('es-MX')}</Popup>
                  </Marker>
                  <MoverMapa centro={[registroActivo.ubicacion.lat, registroActivo.ubicacion.lng]} />
                </MapContainer>
              ) : <div style={{ padding: '30px', color: '#64748B', textAlign: 'center' }}>Adquiriendo coordenadas del GPS...</div>}
            </div>
          </div>

          {/* PANEL: PERIFÉRICOS CONECTADOS */}
          <div style={{ backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
            <div style={{ padding: '18px 25px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between' }}>
              <strong style={{ color: '#1E293B', fontSize: '1.1rem' }}>Puertos COM y Dispositivos USB</strong>
              <span style={{ fontSize: '0.85rem', color: '#64748B', backgroundColor: '#E2E8F0', padding: '2px 8px', borderRadius: '12px' }}>
                {registroActivo?.perifericos_usb?.length || 0} detectados
              </span>
            </div>
            <div style={{ padding: '20px 25px' }}>
              {registroActivo?.perifericos_usb && registroActivo.perifericos_usb.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#334155', fontSize: '0.95rem' }}>
                  {registroActivo.perifericos_usb.map((periferico, idx) => (
                    <li key={idx} style={{ marginBottom: '8px' }}>
                      {periferico.includes('COM') ? '🔌 ' : '🖴 '} 
                      {periferico}
                    </li>
                  ))}
                </ul>
              ) : (
                <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>No se detectaron periféricos externos en este registro.</span>
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: LOG DE AUDITORÍA */}
        <div style={{ backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 25px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
            <strong style={{ color: '#1E293B', fontSize: '1.1rem' }}>Log de Auditoría</strong>
          </div>
          <div style={{ padding: '0', overflowY: 'auto', maxHeight: '600px' }}>
            {datos.length > 0 ? datos.map((d, i) => {
              const isSelected = registroActivo?._id === d._id; 
              
              return (
                <div 
                  key={d._id || i} 
                  onClick={() => setRegistroActivo(d)}
                  style={{ 
                    padding: '16px 25px', 
                    borderBottom: i !== datos.length - 1 ? '1px solid #F1F5F9' : 'none', 
                    display: 'flex', 
                    gap: '15px', 
                    alignItems: 'flex-start',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#E0F2FE' : 'transparent', 
                    borderLeft: isSelected ? '4px solid #0284C7' : '4px solid transparent', 
                    transition: 'all 0.2s'
                  }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: isSelected ? '#0284C7' : '#94A3B8', marginTop: '6px' }}></div>
                  <div>
                    <div style={{ color: isSelected ? '#0369A1' : '#0F172A', fontWeight: isSelected ? '700' : '600', fontSize: '0.95rem', marginBottom: '2px' }}>{d.evento}</div>
                    <div style={{ color: '#64748B', fontSize: '0.85rem' }}>
                      {new Date(d.offline_timestamp).toLocaleDateString('es-MX')} a las {new Date(d.offline_timestamp).toLocaleTimeString('es-MX')}
                    </div>
                  </div>
                </div>
              )
            }) : (
              <div style={{ padding: '30px', color: '#94A3B8', textAlign: 'center', fontStyle: 'italic' }}>
                Este equipo aún no ha enviado alertas o reportes recientes.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;

//hola