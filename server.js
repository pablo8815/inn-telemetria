const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Importamos el modelo de Telemetría que ya tenías
const Telemetry = require('./models/Telemetry');

// --- 1. NUEVO: DEFINIMOS EL MODELO DEL CATÁLOGO DE EQUIPOS ---
const equipoSchema = new mongoose.Schema({
    equipo_id: { type: String, required: true, unique: true },
    usuario_asignado: { type: String, default: 'Pendiente' },
    ultima_conexion: Date
});
const Equipo = mongoose.models.Equipo || mongoose.model('Equipo', equipoSchema);

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Conectado exitosamente a MongoDB'))
    .catch(err => console.error('Error conectando a Mongo:', err));

// --- 2. RUTA POST ACTUALIZADA (Agente Python envía datos + Catálogo) ---
app.post('/api/telemetry', async(req, res) => {
    try {
        const eventos = req.body;
        if (!Array.isArray(eventos) || eventos.length === 0) {
            return res.status(400).json({ error: 'Se esperaba un array de eventos' });
        }

        // A) Guardar en el historial general (Lo que ya tenías)
        await Telemetry.insertMany(eventos);

        // B) NUEVO: Actualizar o crear el equipo en el Catálogo Oficial
        for (const evento of eventos) {
            if (evento.equipo_id) {
                await Equipo.findOneAndUpdate(
                    { equipo_id: evento.equipo_id }, // Buscar por nombre del equipo
                    { 
                        equipo_id: evento.equipo_id,
                        ultima_conexion: evento.offline_timestamp || new Date()
                    },
                    { upsert: true, new: true } // "upsert" significa: si no existe, créalo
                );
            }
        }

        console.log(`Se insertaron ${eventos.length} eventos y se actualizó el catálogo.`);
        res.status(200).json({ message: 'Telemetría y catálogo guardados correctamente' });
    } catch (error) {
        console.error('Error guardando telemetría:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// --- 3. NUEVA RUTA GET (Para que el Panel de React lea el Catálogo) ---
app.get('/api/equipos', async (req, res) => {
    try {
        const equipos = await Equipo.find().sort({ ultima_conexion: -1 });
        res.json(equipos);
    } catch (err) {
        console.error('Error leyendo equipos:', err);
        res.status(500).send(err);
    }
});

// --- 4. RUTA GET HISTORIAL (Para el mapa y la auditoría) ---
app.get('/api/telemetry', async (req, res) => {
    try {
        // Aumentamos el límite a 100 para que tengas más registros en la auditoría
        const datos = await Telemetry.find().sort({ offline_timestamp: -1 }).limit(100);
        res.json(datos);
    } catch (err) {
        console.error('Error leyendo telemetría:', err);
        res.status(500).send(err);
    }
});

// --- 5. RUTA PUT (Para actualizar el usuario asignado en Gestión de Activos) ---
app.put('/api/equipos/:equipo_id', async (req, res) => {
    try {
        const { usuario_asignado } = req.body;
        // Busca el equipo por su ID (ej. INN-L28) y actualiza el campo del usuario
        const equipoActualizado = await Equipo.findOneAndUpdate(
            { equipo_id: req.params.equipo_id },
            { usuario_asignado: usuario_asignado },
            { new: true }
        );
        res.json({ message: 'Usuario actualizado correctamente', equipo: equipoActualizado });
    } catch (err) {
        console.error('Error actualizando equipo:', err);
        res.status(500).json({ error: 'Error al actualizar el usuario' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de rastreo corriendo en el puerto ${PORT}`);
});