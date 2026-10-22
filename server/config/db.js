import mongoose from 'mongoose';

let isConnected = false;

/**
 * Connect to MongoDB database
 * Uses MONGO_URI from .env environment variables
 */
const connectDB = async () => {
  if (isConnected) {
    return;
  }

  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/food_production_platform';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
    });

    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host} (DB: ${conn.connection.name})`);
  } catch (error) {
    isConnected = false;
    console.warn(`⚠️  MongoDB Connection Warning: ${error.message}`);
    console.warn(`----------------------------------------------------------------------`);
    console.warn(`👉 To connect your database:`);
    console.warn(`   1. Open: server/.env`);
    console.warn(`   2. Set MONGO_URI to your free MongoDB Atlas cluster URI`);
    console.warn(`      OR start your local MongoDB service.`);
    console.warn(`   The Express API is running, but database operations will pause until connected.`);
    console.warn(`----------------------------------------------------------------------`);
  }
};

export const checkDBStatus = () => isConnected;

export default connectDB;
