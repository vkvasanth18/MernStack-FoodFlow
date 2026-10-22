import mongoose from 'mongoose';

let isConnected = false;

// Attach connection lifecycle event listeners
mongoose.connection.on('connected', () => {
  isConnected = true;
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('⚠️  MongoDB connection disconnected.');
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  console.error(`❌ MongoDB connection error: ${err.message}`);
});

/**
 * Connect to MongoDB Atlas database
 * Reads connection string securely from process.env.MONGO_URI
 */
const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is missing. Please define MONGO_URI in server/.env with your MongoDB Atlas connection string.');
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000, // Timeout after 8s if network/IP access is blocked
    });

    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host} (Database: ${conn.connection.name})`);
    return conn;
  } catch (error) {
    isConnected = false;
    // Log user-friendly message without exposing database credentials
    console.error(`❌ MongoDB Connection Failed: ${error.message}`);
    throw error;
  }
};

export const checkDBStatus = () => isConnected && mongoose.connection.readyState === 1;

export default connectDB;
