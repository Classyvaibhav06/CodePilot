import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import generateRoutes from './routes/generateRoutes.js';

dotenv.config();

const port = process.env.PORT || 5000;

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/v1/generate', generateRoutes);

app.get('/', (req, res) => {
  res.send('API is running...');
});

app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  
  // List Groq models using OpenAI SDK
  try {
    const { default: OpenAI } = await import('openai');
    const groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
    const list = await groq.models.list();
    console.log('[DEBUG] Groq Models:', list.data.map(m => m.id).join(', '));
  } catch (err) {
    console.error('[DEBUG] Failed to list Groq models:', err.message);
  }
});
