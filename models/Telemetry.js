const mongoose = require('mongoose');

const telemetrySchema = new mongoose.Schema({
    equipo_id: { type: String, required: true },
    evento: { type: String, required: true },
    ubicacion: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 }
    },
    perifericos_usb: [{ type: String }],
    offline_timestamp: { type: Date, required: true }, // Hora real en que pasó en planta
    sync_timestamp: { type: Date, default: Date.now } // Hora en que llegó al servidor
});

module.exports = mongoose.model('Telemetry', telemetrySchema);