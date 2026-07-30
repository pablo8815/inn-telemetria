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

// Componente para animar el mapa hacia la nueva coordenada
function MoverMapa({ centro }) {
  const map = useMap();
  useEffect(() => {
    if (centro) {
      map.flyTo(centro, 16, { duration: 1.5 });
    }
  }, [centro, map]);
  return null;
}

// --- NUEVO COMPONENTE: CALENDARIO ESTILO WIDGET OSCURO ---
function CalendarioPersonalizado({ fechaSeleccionada, setFechaSeleccionada, diasConRegistros }) {
  const [fechaVista, setFechaVista] = useState(new Date());

  const mesActual = fechaVista.getMonth();
  const añoActual = fechaVista.getFullYear();

  const diasMes = new Date(añoActual, mesActual + 1, 0).getDate();
  const primerDiaMes = new Date(añoActual, mesActual, 1).getDay(); // 0 (Dom) a 6 (Sab)

  // Ajustar para que el lunes sea el primer día de la semana en la cuadrícula
  let inicioSemana = primerDiaMes === 0 ? 6 : primerDiaMes - 1;

  const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  const diasSemana = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

  const irMesAnterior = () => setFechaVista(new Date(añoActual, mesActual - 1, 1));
  const irMesSiguiente = () => setFechaVista(new Date(añoActual, mesActual + 1, 1));

  const celdas = [];
  
  // Rellenar espacios vacíos antes del primer día del mes
  for (let i = 0; i < inicioSemana; i++) {
      celdas.push(<div key={`empty-${i}`}></div>);
  }

  // Renderizar los días del mes
  for (let dia = 1; dia <= diasMes; dia++) {
      const fechaIteracion = new Date(añoActual, mesActual, dia);
      const fechaStr = fechaIteracion.toLocaleDateString('es-MX');
      const isSelected = fechaStr === fechaSeleccionada;
      const tieneRegistros = diasConRegistros.includes(fechaStr);

      celdas.push(
          <div
              key={dia}
              onClick={() => setFechaSeleccionada(fechaStr)}
              style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: isSelected ? '#1E293B' : 'white',
                  backgroundColor: isSelected ? 'white' : 'transparent',
                  border: isSelected ? 'none' : '1px solid #475569',
                  position: 'relative',
                  transition: 'all 0.2s'
              }}
          >
              {dia}
              {/* Puntito indicador si el día tiene registros en la BD */}
              {tieneRegistros && !isSelected && (
                  <div style={{ position: 'absolute', bottom: '-4px', width: '4px', height: '4px', backgroundColor: '#38BDF8', borderRadius: '50%' }}></div>
              )}
          </div>
      );
  }

  return (
      <div style={{ backgroundColor: '#282C34', padding: '25px', borderRadius: '10px', color: 'white', width: '100%', boxSizing: 'border-box', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontWeight: '600', letterSpacing: '1px', fontSize: '0.95rem' }}>{meses[mesActual]} {añoActual}</span>
              <div style={{ display: 'flex', gap: '20px' }}>
                  <button onClick={irMesAnterior} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}>‹</button>
                  <button onClick={irMesSiguiente} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}>›</button>
              </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', textAlign: 'center', marginBottom: '15px' }}>
              {diasSemana.map(d => (
                  <div key={d} style={{ color: '#94A3B8', fontSize: '0.75rem', fontWeight: '700' }}>{d}</div>
              ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', placeItems: 'center' }}>
              {celdas}
          </div>
      </div>
  );
}

function App() {
  const [registros, setRegistros] = useState([]);
  const [equipos, setEquipos] = useState([]); 
  const [vista, setVista] = useState('dashboard'); 
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  
  const [usuariosEditables, setUsuariosEditables] = useState({});

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const resTelemetria = await fetch(`https://inn-telemetria.onrender.com/api/telemetry?t=${Date.now()}`, { cache: 'no-store' });
        const dataTelemetria = await resTelemetria.json();
        if (JSON.stringify(dataTelemetria) !== JSON.stringify(registros)) {
           setRegistros(Array.isArray(dataTelemetria) ? dataTelemetria : []);
        }

        const resEquipos = await fetch(`https://inn-telemetria.onrender.com/api/equipos?t=${Date.now()}`, { cache: 'no-store' });
        const dataEquipos = await resEquipos.json();
        setEquipos(Array.isArray(dataEquipos) ? dataEquipos : []);

      } catch (err) {
        console.error("Error al cargar datos:", err);
      }
    };
    
    cargarDatos();
    const interval = setInterval(cargarDatos, 5000); 
    return () => clearInterval(interval);
  }, [registros]);

  const guardarUsuario = async (equipo_id) => {
    const nuevoUsuario = usuariosEditables[equipo_id];
    
    if (!nuevoUsuario || nuevoUsuario.trim() === '') {
        alert("Por favor escribe un nombre antes de guardar.");
        return; 
    }

    try {
        const res = await fetch(`https://inn-telemetria.onrender.com/api/equipos/${equipo_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_asignado: nuevoUsuario })
        });
        
        if(res.ok) {
            setEquipos(equipos.map(eq => eq.equipo_id === equipo_id ? { ...eq, usuario_asignado: nuevoUsuario } : eq));
            setUsuariosEditables({...usuariosEditables, [equipo_id]: ''});
            alert(`¡Usuario asignado a ${equipo_id} actualizado con éxito!`);
        }
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Ocurrió un error de red al intentar guardar.");
    }
  };

 const ahora = new Date();
 const equiposEnRed = equipos.filter(eq => {
   if (!eq.ultima_conexion) return false;
   const ultimaConexionDate = new Date(eq.ultima_conexion);
   const diffMinutos = (ahora - ultimaConexionDate) / 1000 / 60;
   return diffMinutos < 70;
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
          <MenuItem active={vista === 'gestion'} onClick={() => setVista('gestion')} icon="💻" text="Gestión de Activos" />
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
            {vista === 'dashboard' ? 'Monitor de Dispositivos Activos' : 
             vista === 'gestion' ? 'Gestión y Asignación de Activos' : 
             `Detalle de Activo: ${equipoSeleccionado}`}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ color: '#64748B', fontSize: '0.9rem', fontWeight: '500' }}>Ing. Pablo García</span>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#E0F2FE', color: '#0369A1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '1px solid #BAE6FD' }}>PG</div>
          </div>
        </header>

        <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
          
          {vista === 'dashboard' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                <KpiCard titulo="Total de Equipos Registrados" valor={equipos.length} color="#3B82F6" />
                <KpiCard titulo="Equipos Reportando" valor={equiposEnRed} color="#10B981" />
                <KpiCard titulo="Alertas del Sistema" valor="0" color="#EF4444" />
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '25px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#1E293B', fontSize: '1.1rem' }}>Listado de Unidades</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
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
                          {enLinea ? (
                            <span style={{ background: '#DCFCE7', color: '#166534', padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #BBF7D0' }}>En red</span>
                          ) : (
                            <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #FECACA' }}>Desconectado</span>
                          )}
                        </div>
                        
                        <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '15px', marginTop: '10px' }}>
                          <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#64748B' }}>Usuario Asignado: <strong style={{ color: '#334155' }}>{equipo.usuario_asignado || 'Pendiente'}</strong></p>
                          <p style={{ margin: '0', fontSize: '0.85rem', color: '#64748B' }}>Última sincronización: <strong style={{ color: '#334155' }}>{ultimaConexion ? ultimaConexion.toLocaleTimeString('es-MX') : '--'}</strong></p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {vista === 'gestion' && (
            <div style={{ backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '25px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#1E293B', fontSize: '1.1rem' }}>Directorio de Asignaciones</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {equipos.map(equipo => {
                        const ultimaConexion = equipo.ultima_conexion ? new Date(equipo.ultima_conexion) : null;
                        const diffMinutos = ultimaConexion ? (ahora - ultimaConexion) / 1000 / 60 : Infinity;
                        const enLinea = diffMinutos < 15;

                        return (
                            <div key={equipo.equipo_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 25px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#F8FAFC' }}>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', minWidth: '250px' }}>
                                    <strong style={{ fontSize: '1.1rem', color: '#0F172A' }}>{equipo.equipo_id}</strong>
                                    {enLinea ? (
                                        <span style={{ background: '#DCFCE7', color: '#166534', padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #BBF7D0' }}>En red</span>
                                    ) : (
                                        <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #FECACA' }}>Desconectado</span>
                                    )}
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1, justifyContent: 'flex-end' }}>
                                    <span style={{ color: '#64748B', fontSize: '0.9rem' }}>Responsable actual: <strong style={{color: '#334155'}}>{equipo.usuario_asignado || 'Pendiente'}</strong></span>
                                    
                                    <input 
                                        type="text" 
                                        placeholder="Escribe el nuevo nombre..."
                                        value={usuariosEditables[equipo.equipo_id] || ''}
                                        onChange={(e) => setUsuariosEditables({
                                            ...usuariosEditables, 
                                            [equipo.equipo_id]: e.target.value
                                        })}
                                        style={{ width: '250px', padding: '10px 15px', border: '1px solid #CBD5E1', borderRadius: '6px', outline: 'none', fontSize: '0.9rem' }}
                                    />
                                    <button 
                                        onClick={() => guardarUsuario(equipo.equipo_id)}
                                        style={{ background: '#0284C7', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                    >
                                        Guardar
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                    
                    {equipos.length === 0 && (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic' }}>
                            Aún no hay equipos registrados en el catálogo oficial.
                        </div>
                    )}
                </div>
            </div>
          )}

          {vista === 'detalle' && (
             <DashboardEquipo equipoId={equipoSeleccionado} datos={registros.filter(r => r.equipo_id === equipoSeleccionado)} onBack={() => setVista('dashboard')} />
          )}

        </div>
      </main>
    </div>
  );
}

function MenuItem({ icon, text, active, onClick }) {
  return (
    <div onClick={onClick} style={{ padding: '12px 24px', margin: '4px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: active ? '#334155' : 'transparent', color: active ? 'white' : '#94A3B8', transition: 'all 0.2s', borderLeft: active ? '3px solid #38BDF8' : '3px solid transparent' }}>
      <span style={{ fontSize: '1.2rem', opacity: active ? 1 : 0.7 }}>{icon}</span>
      <span style={{ fontWeight: '500', fontSize: '0.95rem' }}>{text}</span>
    </div>
  );
}

function KpiCard({ titulo, valor, color }) {
  return (
    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0', borderLeft: `5px solid ${color}` }}>
      <h4 style={{ margin: '0 0 12px 0', color: '#64748B', fontWeight: '500', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{titulo}</h4>
      <span style={{ fontSize: '2.2rem', fontWeight: '700', color: '#0F172A' }}>{valor}</span>
    </div>
  );
}

function DashboardEquipo({ equipoId, datos, onBack }) {
  // Lista de días en los que sí hay datos para marcar los puntitos en el calendario
  const diasConRegistros = Array.from(new Set(datos.map(d => {
    return new Date(d.offline_timestamp).toLocaleDateString('es-MX');
  })));

  // SECCIÓN CLAVE: El calendario carga por defecto el día ACTUAL (hoy)
  const hoy = new Date().toLocaleDateString('es-MX');
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoy);

  // Filtrar registros que coincidan exactamente con la fecha seleccionada en el calendario
  const datosFiltrados = datos.filter(d => {
    const fechaRegistro = new Date(d.offline_timestamp).toLocaleDateString('es-MX');
    return fechaRegistro === fechaSeleccionada;
  });

  const [registroActivo, setRegistroActivo] = useState(datosFiltrados[0]); 

  // Si cambia el día y hay registros, selecciona el más reciente de ese día
  useEffect(() => {
    if (datosFiltrados.length > 0) {
      setRegistroActivo(datosFiltrados[0]);
    } else {
      setRegistroActivo(null); // Limpia si es un día vacío
    }
  }, [fechaSeleccionada, datos]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <button onClick={onBack} style={{ alignSelf: 'flex-start', background: 'white', border: '1px solid #CBD5E1', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        ← Volver al listado general
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '25px' }}>
        
        {/* COLUMNA IZQUIERDA: MAPA Y HARDWARE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
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
              ) : <div style={{ padding: '30px', color: '#64748B', textAlign: 'center' }}>No hay coordenadas disponibles para el registro seleccionado.</div>}
            </div>
          </div>

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
                <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>No se detectaron periféricos o no hay registros.</span>
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: CALENDARIO OSCURO Y LOG DE AUDITORÍA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* AQUÍ INYECTAMOS TU NUEVO CALENDARIO WIDGET */}
          <CalendarioPersonalizado 
            fechaSeleccionada={fechaSeleccionada} 
            setFechaSeleccionada={setFechaSeleccionada} 
            diasConRegistros={diasConRegistros} 
          />

          {/* CAJA DE LOG DE AUDITORÍA (LISTA DEL DÍA SELECCIONADO) */}
          <div style={{ backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ padding: '15px 25px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
              <strong style={{ color: '#1E293B', fontSize: '1.1rem' }}>Auditoría del: {fechaSeleccionada}</strong>
            </div>

            <div style={{ padding: '0', overflowY: 'auto', maxHeight: '450px' }}>
              {datosFiltrados.length > 0 ? datosFiltrados.map((d, i) => {
                const isSelected = registroActivo?._id === d._id; 
                
                return (
                  <div 
                    key={d._id || i} 
                    onClick={() => setRegistroActivo(d)}
                    style={{ 
                      padding: '16px 25px', 
                      borderBottom: i !== datosFiltrados.length - 1 ? '1px solid #F1F5F9' : 'none', 
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
                        {new Date(d.offline_timestamp).toLocaleTimeString('es-MX')}
                      </div>
                    </div>
                  </div>
                )
              }) : (
                <div style={{ padding: '40px 20px', color: '#94A3B8', textAlign: 'center', fontStyle: 'italic' }}>
                  Sin actividad detectada para este día en específico. Selecciona otro día en el calendario.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default App;