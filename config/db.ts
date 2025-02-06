// config/db.ts
import mongoose from 'mongoose';
import config from './config';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongodb.uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Validate database connection
    const dbState = mongoose.connection.readyState;
    if (dbState !== 1) {
      throw new Error('Database connection not ready');
    }

    // Log PayPal configuration status
    console.log('PayPal Mode:', config.paypal.mode);
    console.log('PayPal Configuration:', config.paypal.clientId ? 'Present' : 'Missing');

  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  }
};

export default connectDB;