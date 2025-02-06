// config/config.ts
import dotenv from 'dotenv';

dotenv.config();

const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:8848/GlobeLensResearchDB'
  },
  server: {
    port: process.env.PORT || 8848
  },
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID,
    secretKey: process.env.PAYPAL_SECRET_KEY,
    mode: process.env.PAYPAL_MODE || 'sandbox'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key'
  }
};

// Validate required environment variables
const validateConfig = () => {
  const required = ['PAYPAL_CLIENT_ID', 'PAYPAL_SECRET_KEY', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

validateConfig();

export default config;