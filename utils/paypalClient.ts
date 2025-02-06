// utils/paypalClient.ts
import dotenv from 'dotenv';
const paypal = require('@paypal/checkout-server-sdk');

dotenv.config();

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET_KEY = process.env.PAYPAL_SECRET_KEY;

if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET_KEY) {
  throw new Error('PayPal credentials are not properly configured in environment variables');
}

// Create PayPal environment based on mode
const environment = process.env.PAYPAL_MODE === 'sandbox' 
  ? new paypal.core.SandboxEnvironment(PAYPAL_CLIENT_ID, PAYPAL_SECRET_KEY)
  : new paypal.core.LiveEnvironment(PAYPAL_CLIENT_ID, PAYPAL_SECRET_KEY);

// Create PayPal client
const client = new paypal.core.PayPalHttpClient(environment);

export default client;