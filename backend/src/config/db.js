const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nexus';
    const conn = await mongoose.connect(mongoUri, {
      dbName: 'nexus',
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host} (Database: ${conn.connection.name})`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.warn('[Warning] Running backend in standalone mode without active MongoDB connection.');
    mongoose.set('bufferCommands', false);
    return null;
  }
};

module.exports = connectDB;
