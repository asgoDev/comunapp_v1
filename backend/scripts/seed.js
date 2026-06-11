import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

/**
 * Script para crear el primer usuario admin.
 * Ejecutar con: npm run seed
 */
const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB');

        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            console.log('ℹ️  Ya existe un usuario admin:', existingAdmin.email);
            console.log('   No se creó un nuevo usuario.');
            process.exit(0);
        }

        const admin = await User.create({
            nombre: process.env.SEED_NOMBRE || 'Admin',
            apellido: process.env.SEED_APELLIDO || 'Sistema',
            cedula: process.env.SEED_CEDULA || 'V-12345678',
            email: process.env.SEED_EMAIL || 'admin@plantilla.local',
            password: process.env.SEED_PASSWORD || 'Admin123!',
            role: 'admin',
            cargo: 'Administrador',
            estado: 'activo',
        });

        console.log('🎉 Usuario admin creado exitosamente:');
        console.log(`   Nombre:  ${admin.nombre} ${admin.apellido}`);
        console.log(`   Cédula:  ${admin.cedula}`);
        console.log(`   Email:   ${admin.email}`);
        console.log(`   Role:    ${admin.role}`);
        console.log('\n⚠️  Recuerda cambiar la contraseña por defecto.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error en el seed:', error.message);
        process.exit(1);
    }
};

seed();
