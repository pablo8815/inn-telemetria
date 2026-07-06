const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Telemetry = require('./models/Telemetry');

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Conectado exitosamente a MongoDB'))
    .catch(err => console.error('Error conectando a Mongo:', err));
    const TelemetrySchema = new mongoose.Schema({
        equipo_id: String,
        evento: String,
        ubicacion: {
            lat: Number,
            lng: Number
        },
        offline_timestamp: Date,
        // --- AGREGA ESTA LÍNEA ---
        perifericos: { type: [String], default: [] } 
    });

// 1. RUTA POST (La usa el Agente de Python para enviar datos)
app.post('/api/telemetry', async(req, res) => {
    try {
        const eventos = req.body;
        if (!Array.isArray(eventos) || eventos.length === 0) {
            return res.status(400).json({ error: 'Se esperaba un array de eventos' });
        }
        await Telemetry.insertMany(eventos);
        console.log(`Se insertaron ${eventos.length} eventos nuevos.`);
        res.status(200).json({ message: 'Telemetría guardada correctamente' });
    } catch (error) {
        console.error('Error guardando telemetría:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// 2. RUTA GET (La usa tu Panel de React para leer y dibujar el mapa)
// En tu endpoint /api/telemetry (o como lo hayas nombrado)
app.get('/api/telemetry', async (req, res) => {
    try {
        // .sort({ offline_timestamp: -1 }) ordena del más nuevo al más viejo
        const datos = await Telemetry.find().sort({ offline_timestamp: -1 }).limit(20);
        res.json(datos);
    } catch (err) {
        res.status(500).send(err);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de rastreo corriendo en el puerto ${PORT}`);
});