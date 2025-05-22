require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express(); // ✅ ¡Esta línea debe ir al inicio!
app.use(express.json());
app.use(cors());

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "❌ Error de conexión a MongoDB:"));
db.once("open", () => console.log("✅ Conectado a MongoDB"));

// Esquema de prescripción
const medicationRequestSchema = new mongoose.Schema({
  status: String,
  intent: String,
  medicationCodeableConcept: Object,
  subject: Object,
  authoredOn: Date,
  requester: Object,
  dosageInstruction: Array,
  delivered: { type: Boolean, default: false },
  deliveryDate: Date
});

const MedicationRequest = mongoose.model("MedicationRequest", medicationRequestSchema);

// Esquema para historial de entregas
const entregadoSchema = new mongoose.Schema({
  patientId: String,
  medication: String,
  deliveredAt: { type: Date, default: Date.now },
  entregadoPor: String,
  referenciaReceta: String
}, { versionKey: false });

const HistorialEntrega = mongoose.model("HistorialEntrega", entregadoSchema);

// Ruta principal
app.get("/", (req, res) => {
  res.send("🚀 API de MedicationRequest funcionando");
});

// Obtener todas las prescripciones
app.get("/api/medicationrequest", async (req, res) => {
  try {
    const data = await MedicationRequest.find();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los datos" });
  }
});

// Obtener una prescripción por ID
app.get("/api/medicationrequest/:id", async (req, res) => {
  try {
    const med = await MedicationRequest.findById(req.params.id);
    if (!med) return res.status(404).json({ error: "No encontrado" });
    res.json(med);
  } catch (error) {
    res.status(500).json({ error: "Error al buscar la prescripción" });
  }
});

// Crear nueva prescripción (médico)
app.post("/api/medicationrequest", async (req, res) => {
  try {
    const nuevaMed = new MedicationRequest({
      ...req.body,
      delivered: false
    });
    await nuevaMed.save();
    res.status(201).json({ mensaje: "Prescripción guardada", data: nuevaMed });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al guardar la prescripción", error });
  }
});

// Marcar como entregada y guardar en historial clínico (farmacéutico)
app.put("/api/medicationrequest/:id/deliver", async (req, res) => {
  try {
    console.log("🔄 Iniciando entrega de receta:", req.params.id);

    const med = await MedicationRequest.findById(req.params.id);
    if (!med) {
      console.log("❌ Receta no encontrada");
      return res.status(404).json({ error: "Prescripción no encontrada" });
    }

    med.delivered = true;
    med.deliveryDate = new Date();
    await med.save();
    console.log("✅ Receta marcada como entregada");

    const historial = new HistorialEntrega({
      patientId: med.subject.reference,
      medication: med.medicationCodeableConcept.text,
      entregadoPor: req.body.entregadoPor || "farmaceutico-desconocido",
      referenciaReceta: med._id.toString()
    });

    await historial.save();
    console.log("📝 Historial clínico guardado correctamente:", historial);

    res.json({ mensaje: "Entrega confirmada y registrada en historia clínica", data: med });
  } catch (error) {
    console.error("❌ Error inesperado:", error);
    res.status(500).json({ error: "Error al actualizar la entrega y registrar historial" });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
