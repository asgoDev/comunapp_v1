import mongoose from 'mongoose';

const connectDB = async () => {
  let connected = false;
  while (!connected) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI);
      console.log(`✅ MongoDB conectado: ${conn.connection.host}`);

      // ── Limpiar índices huérfanos de schemas anteriores ──
      await cleanStaleIndexes(conn);
      connected = true;
    } catch (error) {
      console.error(`❌ Error de conexión a MongoDB: ${error.message}`);
      console.log('🔄 Reintentando conectar en 5 segundos...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

/**
 * Elimina índices que ya no corresponden al schema actual.
 * Resuelve errores como: E11000 duplicate key ... index: username_1
 */
const cleanStaleIndexes = async (conn) => {
  try {
    const db = conn.connection.db;
    const collections = await db.listCollections().toArray();

    for (const col of collections) {
      const collection = db.collection(col.name);
      const indexes = await collection.indexes();

      for (const index of indexes) {
        // Ignorar el índice _id por defecto
        if (index.name === '_id_') continue;

        const fields = Object.keys(index.key);
        // Detectar índices de campos que probablemente no existen
        const staleFields = ['username', 'userName'];
        const isStale = fields.some((f) => staleFields.includes(f));

        if (isStale) {
          await collection.dropIndex(index.name);
          console.log(`🧹 Índice huérfano eliminado: ${col.name}.${index.name}`);
        }
      }
    }
  } catch (error) {
    // No es crítico, solo informar
    console.warn('⚠️ No se pudieron limpiar índices:', error.message);
  }
};

export default connectDB;
