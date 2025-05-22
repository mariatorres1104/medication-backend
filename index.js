app.put("/api/medicationrequest/:id/deliver", async (req, res) => {
  try {
    console.log("Iniciando entrega de receta:", req.params.id);

    const med = await MedicationRequest.findById(req.params.id);
    if (!med) {
      console.log("Receta no encontrada");
      return res.status(404).json({ error: "Prescripción no encontrada" });
    }

    med.delivered = true;
    med.deliveryDate = new Date();
    await med.save();
    console.log("Receta marcada como entregada");

    const historial = new HistorialEntrega({
      patientId: med.subject.reference,
      medication: med.medicationCodeableConcept.text,
      entregadoPor: req.body.entregadoPor || "farmaceutico-desconocido",
      referenciaReceta: med._id.toString()
    });

    await historial.save();
    console.log(" Historial clínico guardado correctamente:", historial);

    res.json({ mensaje: "Entrega confirmada y registrada en historia clínica", data: med });

  } catch (error) {
    console.error("Error inesperado:", error);
    res.status(500).json({ error: "Error al actualizar la entrega y registrar historial" });
  }
});
