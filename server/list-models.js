import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function listGroqModels() {
  console.log('--- Groq Models ---');
  if (!process.env.GROQ_API_KEY) {
    console.log('No GROQ_API_KEY');
    return;
  }
  const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });
  try {
    const list = await groq.models.list();
    console.log(list.data.map(m => m.id).join('\n'));
  } catch (err) {
    console.error('Error fetching Groq models:', err.message);
  }
}

async function listNvidiaModels() {
  console.log('--- NVIDIA Models ---');
  if (!process.env.NVIDIA_API_KEY) {
    console.log('No NVIDIA_API_KEY');
    return;
  }
  const nvidia = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: 'https://integrate.api.nvidia.com/v1',
  });
  try {
    const list = await nvidia.models.list();
    console.log(list.data.map(m => m.id).join('\n'));
  } catch (err) {
    console.error('Error fetching NVIDIA models:', err.message);
  }
}

async function main() {
  await listGroqModels();
  await listNvidiaModels();
}

main();
