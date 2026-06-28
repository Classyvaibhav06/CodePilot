import OpenAI from 'openai';
import ContextManager from '../services/ContextManager.js';
import Project from '../models/Project.js';
import Message from '../models/Message.js';

// ── Stage 1: Extract JSON string from AI prose/markdown ──────────────────────
function extractJsonString(text) {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) return text.substring(start, end + 1);
  return null;
}

// ── Stage 2: Sanitize illegal control characters inside JSON string values ───
function sanitizeJsonString(str) {
  let result = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escaped) { result += ch; escaped = false; continue; }
    if (ch === '\\') { escaped = true; result += ch; continue; }
    if (ch === '"') { inString = !inString; result += ch; continue; }
    if (inString) {
      if (ch === '\n') { result += '\\n'; continue; }
      if (ch === '\r') { result += '\\r'; continue; }
      if (ch === '\t') { result += '\\t'; continue; }
      const code = ch.charCodeAt(0);
      if (code < 0x20) { result += `\\u${code.toString(16).padStart(4, '0')}`; continue; }
    }
    result += ch;
  }
  return result;
}

// ── Stage 3: Last-resort regex field extraction ───────────────────────────────
function regexExtractResponse(text) {
  const messageMatch = text.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const message = messageMatch ? messageMatch[1] : null;
  const files = [];
  const fileBlockRegex = /\{\s*"filePath"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"([\s\S]*?)(?<!\\)"\s*\}/g;
  let m;
  while ((m = fileBlockRegex.exec(text)) !== null) {
    try {
      const content = JSON.parse(`"${m[2]}"`);
      files.push({ filePath: m[1], content });
    } catch (e) {
      files.push({ filePath: m[1], content: m[2].replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"') });
    }
  }
  return { message, files };
}

// ── Main Generate Handler ─────────────────────────────────────────────────────
export const generateCode = async (req, res) => {
  const { prompt, model = 'llama-3.3-70b-versatile' } = req.body;
  let { projectId } = req.body;

  if (!prompt) return res.status(400).json({ message: 'Prompt is required' });

  try {
    // Step 1: Ensure Project Context
    console.log('[Context Engine] Step 1: Init Project Context...');
    if (!projectId) {
      const newProject = await Project.create({ userId: req.user._id, name: 'Untitled Project - ' + Date.now() });
      projectId = newProject._id;
    }

    // Step 2: Save User Message
    console.log('[Context Engine] Step 2: Saving Message...');
    await Message.create({ projectId, role: 'user', content: prompt });

    // Step 3: Build Context Pipeline
    console.log('[Context Engine] Step 3: Building Context Pipeline...');
    const messages = await ContextManager.buildPromptContext(projectId, prompt);

    // Step 4: Smart API Routing — Models with / → NVIDIA, others → Groq
    let completion;
    let usedModel = model;
    let provider = model.includes('/') ? 'NVIDIA' : 'Groq';
    console.log(`[Context Engine] Step 4: Calling AI via ${provider} (${model})...`);

    if (provider === 'NVIDIA') {
      try {
        const client = new OpenAI({
          apiKey: process.env.NVIDIA_API_KEY,
          baseURL: 'https://integrate.api.nvidia.com/v1'
        });
        completion = await client.chat.completions.create({
          model: usedModel,
          messages,
          temperature: 0.5,
          top_p: 1,
          max_tokens: 16000,
          stream: false,
        });
      } catch (nvidiaError) {
        console.warn(`[Context Engine] NVIDIA API failed with error: ${nvidiaError.message}. Falling back to Groq (deepseek-r1-distill-llama-70b)...`);
        provider = 'Groq';
        usedModel = 'deepseek-r1-distill-llama-70b';
      }
    }

    if (provider === 'Groq') {
      const client = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1'
      });
      
      const payload = {
        model: usedModel,
        messages,
        temperature: 0.5,
        top_p: 1,
        max_tokens: 6000,
        stream: false,
      };

      if (usedModel.includes('deepseek-r1')) {
        payload.reasoning_format = 'parsed';
      }

      completion = await client.chat.completions.create(payload);
    }

    let reasoning = completion.choices[0]?.message?.reasoning || completion.choices[0]?.message?.reasoning_content;
    let rawContent = completion.choices[0]?.message?.content || '{}';

    // If reasoning is embedded in <think> tags (e.g. if parsed formatting is not applied or fallback occurs), extract and strip it
    if (!reasoning && rawContent.includes('<think>')) {
      const thinkMatch = rawContent.match(/<think>([\s\S]*?)<\/think>/);
      if (thinkMatch) {
        reasoning = thinkMatch[1].trim();
        rawContent = rawContent.replace(/<think>[\s\S]*?<\/think>/, '').trim();
      }
    }

    // Step 5: 4-Stage Resilient JSON Parser
    let jsonResponse;
    const extracted = extractJsonString(rawContent);

    if (extracted) {
      try {
        jsonResponse = JSON.parse(extracted);
        console.log('[Parser] Stage 1 success: clean JSON.parse');
      } catch (e1) {
        try {
          jsonResponse = JSON.parse(sanitizeJsonString(extracted));
          console.log('[Parser] Stage 2 success: sanitized JSON.parse');
        } catch (e2) {
          console.warn('[Parser] Stage 3 fallback: regex extraction. Error:', e2.message);
          const { message: regexMsg, files: regexFiles } = regexExtractResponse(rawContent);
          jsonResponse = { message: regexMsg || 'Code generated (fallback parser).', modifiedFiles: regexFiles };
        }
      }
    } else {
      jsonResponse = { message: 'Could not find JSON in AI response.', modifiedFiles: [] };
    }

    // Step 6: Save AI Message
    await Message.create({ projectId, role: 'ai', content: rawContent });

    // Step 7: Index Files in Background
    if (jsonResponse.modifiedFiles?.length > 0) {
      ContextManager.indexFiles(projectId, jsonResponse.modifiedFiles).catch(console.error);
    }

    res.status(200).json({
      projectId,
      reasoning: reasoning || null,
      message: jsonResponse.message || 'Code generated. Check the preview!',
      content: rawContent,
      modifiedFiles: jsonResponse.modifiedFiles || [],
    });

  } catch (error) {
    if (error.status === 429) {
      console.warn('Rate Limit Exceeded (429).');
      return res.status(429).json({ message: '⚠️ API Rate Limit Exceeded. Please wait a few seconds and try again.' });
    }
    if (error.status === 413) {
      console.warn('Token Limit Exceeded (413).');
      return res.status(413).json({ message: '⚠️ Token Limit Exceeded. Try a shorter prompt or switch models.' });
    }
    console.error('AI Generation Error:', error);
    res.status(500).json({ message: 'Failed to generate code', error: error.message });
  }
};
