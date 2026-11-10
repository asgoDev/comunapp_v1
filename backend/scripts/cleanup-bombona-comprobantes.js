import "dotenv/config";
import mongoose from "mongoose";
import PagoBombona from "../src/modules/bombonas/pagoBombona.model.js";
import cloudinaryService from "../src/modules/bombonas/cloudinary.service.js";

const APPLY_CHANGES = process.argv.includes("--apply");
const MAX_BATCH_SIZE = 100;

const main = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI no está configurada.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  try {
    const now = new Date();
    const expiredFilter = {
      "comprobante.disponible": true,
      "comprobante.expiraEn": { $lte: now },
    };
    const payments = await PagoBombona.find(expiredFilter)
      .select("+comprobante.publicId")
      .sort({ "comprobante.ultimoIntentoLimpieza": 1, "comprobante.expiraEn": 1 })
      .limit(MAX_BATCH_SIZE)
      .lean();

    if (!APPLY_CHANGES) {
      console.log(`Simulación: ${payments.length} comprobantes vencidos en el lote (máximo ${MAX_BATCH_SIZE}).`);
      console.log("Para eliminarlos en Cloudinary y marcar el metadato, vuelva a ejecutar con --apply.");
      return;
    }

    let eliminados = 0;
    let fallidos = 0;
    for (const payment of payments) {
      try {
        await cloudinaryService.deleteComprobante(payment.comprobante.publicId);
        await PagoBombona.updateOne(
          { _id: payment._id, "comprobante.disponible": true },
          {
            $set: {
              "comprobante.disponible": false,
              "comprobante.eliminadoEn": new Date(),
            },
          },
        );
        eliminados += 1;
      } catch (error) {
        await PagoBombona.updateOne(
          { _id: payment._id, "comprobante.disponible": true },
          {
            $inc: { "comprobante.intentosLimpieza": 1 },
            $set: { "comprobante.ultimoIntentoLimpieza": new Date() },
          },
        ).catch(() => {});
        console.error("Falló la eliminación programada de un comprobante.", { code: error.code });
        fallidos += 1;
      }
    }

    console.log(`Limpieza finalizada: ${eliminados} eliminados, ${fallidos} fallidos, ${payments.length} procesados.`);
    if (fallidos > 0) process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

main().catch(async (error) => {
  console.error("No se pudo ejecutar la limpieza de comprobantes.", { name: error.name, code: error.code });
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
