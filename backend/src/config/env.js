import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from config.env
const configPath = path.join(__dirname, '../../config.env');
const result = dotenv.config({ path: configPath });

if (result.error) {
  console.error('❌ Error loading environment variables:', result.error.message);
  process.exit(1);
}

console.log('✅ Environment variables loaded successfully');
console.log('📋 Google Cloud Config:');
console.log('  PROJECT_ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
console.log('  LOCATION:', process.env.GOOGLE_CLOUD_LOCATION);
console.log('  BUCKET_NAME:', process.env.GOOGLE_CLOUD_BUCKET_NAME);

export default {
  loaded: true
}; 