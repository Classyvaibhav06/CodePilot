import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from the server directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.NVIDIA_API_KEY;

if (!apiKey) {
  console.error('❌ Error: NVIDIA_API_KEY is not defined in .env');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

async function testAPI() {
  console.log('🔄 Testing NVIDIA API Connection...');
  console.log('Key:', apiKey.substring(0, 10) + '...');
  
  try {
    const completion = await openai.chat.completions.create({
      model: "deepseek-ai/deepseek-v4-flash",
      messages: [{ "role": "user", "content": "Say 'hello world' if you receive this." }],
      temperature: 1,
      top_p: 0.95,
      max_tokens: 100,
      chat_template_kwargs: { "thinking": true, "reasoning_effort": "high" },
      stream: false
    });

    console.log('\n✅ Success! Received response:');
    console.log('-----------------------------------');
    if (completion.choices[0]?.message?.reasoning_content) {
      console.log('🧠 Reasoning:\n', completion.choices[0]?.message?.reasoning_content);
    }
    console.log('💬 Content:\n', completion.choices[0]?.message?.content);
    console.log('-----------------------------------');

  } catch (error) {
    console.error('\n❌ API Error Details:');
    if (error.response) {
      console.error(error.response.status, error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testAPI();
