import EmbeddingService from './EmbeddingService.js';
import Message from '../models/Message.js';
import Project from '../models/Project.js';
import File from '../models/File.js';
import OpenAI from 'openai';

class ContextManager {
  getGroq() {
    if (!this.groq) {
      this.groq = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
      });
    }
    return this.groq;
  }

  /**
   * Layer 1: Conversation Memory (Last 20 messages)
   */
  async getRecentMessages(projectId, limit = 20) {
    const messages = await Message.find({ projectId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    // Reverse to chronological order
    return messages.reverse();
  }

  /**
   * Layer 2: Project Summary Memory
   */
  async getProjectSummary(projectId) {
    const project = await Project.findById(projectId).lean();
    if (!project || !project.summary) {
      return {
        framework: 'React',
        styling: 'Tailwind',
        theme: 'Light',
        projectPurpose: 'A web application built by CodePilot.',
        pages: [],
        components: [],
        dependencies: [],
        routingStructure: ''
      };
    }
    return project.summary;
  }

  /**
   * Layer 3: File Retrieval Memory with Hybrid Scoring
   * Score = 40% semantic + 30% filename + 20% component + 10% recency
   */
  async retrieveRelevantFiles(projectId, prompt, limit = 5) {
    // Get semantic matches from Qdrant
    let qdrantResults = [];
    try {
      qdrantResults = await EmbeddingService.searchRelevantFiles(projectId, prompt, 20);
    } catch (err) {
      console.warn("Qdrant search failed, falling back to basic matching:", err.message);
    }

    // Get all files from DB to do keyword & recency matching
    const allFiles = await File.find({ projectId }).lean();
    if (allFiles.length === 0) return [];

    const promptLower = prompt.toLowerCase();
    const scoredFiles = allFiles.map(file => {
      let score = 0;

      // 1. Semantic Similarity (40%)
      const qMatch = qdrantResults.find(q => q.payload.filePath === file.filePath);
      if (qMatch) {
        // Qdrant cosine similarity is usually 0.0 to 1.0. Multiply by 40 to max out at 40 points.
        score += qMatch.score * 40; 
      }

      // 2. Filename Match (30%)
      const fileName = file.filePath.split('/').pop().toLowerCase();
      if (promptLower.includes(fileName.replace(/\.[^/.]+$/, ""))) { // Match without extension
        score += 30;
      } else if (promptLower.includes(fileName)) {
        score += 25;
      }

      // 3. Component Match (20%)
      if (file.componentName && promptLower.includes(file.componentName.toLowerCase())) {
        score += 20;
      }

      // 4. Recency Match (10%)
      // If edited in the last 24 hours, give full 10 points. Decay linearly.
      const hoursSinceEdit = (Date.now() - new Date(file.lastModifiedByAI).getTime()) / (1000 * 60 * 60);
      let recencyScore = 10 - (hoursSinceEdit * 0.1); // Lose 0.1 points per hour
      if (recencyScore < 0) recencyScore = 0;
      score += recencyScore;

      return { ...file, score };
    });

    // Sort descending and return top `limit`
    scoredFiles.sort((a, b) => b.score - a.score);
    return scoredFiles.slice(0, limit);
  }

  /**
   * Core Context Assembler
   */
  async buildPromptContext(projectId, userPrompt) {
    const summary = await this.getProjectSummary(projectId);
    const recentMessages = await this.getRecentMessages(projectId);
    const relevantFiles = await this.retrieveRelevantFiles(projectId, userPrompt);

    let systemPrompt = `You are an elite UX/UI frontend engineer and master developer. 
You are working on the following project:
---
PROJECT SUMMARY:
Framework: ${summary.framework}
Styling: ${summary.styling}
Theme: ${summary.theme}
Purpose: ${summary.projectPurpose}
Pages: ${summary.pages.join(', ')}
Components: ${summary.components.join(', ')}
Dependencies: ${summary.dependencies.join(', ')}
Routing: ${summary.routingStructure}
---

CRITICAL DESIGN INSTRUCTIONS — READ CAREFULLY:
1. USE INLINE TAILWIND CSS ONLY. Do NOT write or import any .css files.
2. ALWAYS use 'export default function' for every React component. Never use named exports.
3. DO NOT generate plain grey/white boring designs. You MUST create visually STUNNING, modern, and premium interfaces.

VISUAL DESIGN SPEC (MANDATORY):
- DARK SIDEBARS: Use 'bg-slate-900' or 'bg-gray-900' with 'text-white' text for sidebars and navigation
- COLORFUL HEADERS: Use bold gradients like 'bg-gradient-to-r from-violet-600 to-indigo-600' or 'from-blue-600 to-cyan-500'
- VIBRANT ACCENT COLORS: Use bold colors like 'bg-violet-500', 'bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-rose-500' for buttons, badges, charts, and highlights
- METRIC CARDS: Give each metric card a unique vibrant background like 'bg-gradient-to-br from-violet-500 to-purple-700' with 'text-white'
- TABLE ROWS: Use alternating row colors like 'even:bg-gray-50' and hover effects 'hover:bg-indigo-50'
- STATUS BADGES: Use vivid badge colors like 'bg-green-100 text-green-800', 'bg-red-100 text-red-800', 'bg-yellow-100 text-yellow-800'
- SHADOWS: Always use 'shadow-lg' or 'shadow-xl' on cards, never flat designs
- ANIMATIONS: Wrap cards and tables in framer-motion with staggered 'initial={{opacity:0, y:20}}' 'animate={{opacity:1, y:0}}' effects
- ICONS: Always put a colored icon from lucide-react next to every heading and stat
- INLINE STYLE FALLBACK: For guaranteed color rendering in sandbox, ALSO add inline style props with real hex colors alongside Tailwind classes. Example: className="bg-violet-600 text-white" style={{background:'#7c3aed',color:'#fff'}}. This ensures colors show even if Tailwind CDN is still loading.

FORMAT:
{
  "message": "What I built/changed.",
  "modifiedFiles": [
    { "filePath": "src/App.tsx", "content": "import React from 'react';\\n\\nexport default function App() {\\n  return <div>Hello</div>;\\n}" }
  ]
}
---

RELEVANT FILES FOR THIS REQUEST:
`;

    if (relevantFiles.length > 0) {
      relevantFiles.forEach(file => {
        systemPrompt += `\nFile: ${file.filePath}\n\`\`\`\n${file.content}\n\`\`\`\n`;
      });
    } else {
      systemPrompt += "No existing files were highly relevant. You may need to create new files from scratch.\n";
    }

    const messages = [
      { role: "system", content: systemPrompt }
    ];

    // Add recent conversational context
    recentMessages.forEach(msg => {
      messages.push({ role: msg.role, content: msg.content });
    });

    // Finally append the current user prompt
    messages.push({ role: "user", content: userPrompt });

    return messages;
  }

  /**
   * Generates a new summary and updates MongoDB
   */
  async updateSummary(projectId) {
    try {
      const allFiles = await File.find({ projectId }).lean();
      if (allFiles.length === 0) return;

      const fileTree = allFiles.map(f => f.filePath).join('\n');
      
      const summarizePrompt = `Analyze the following file tree and update the project summary.
Files:
${fileTree}

Return ONLY valid JSON:
{
  "projectPurpose": "...",
  "pages": ["..."],
  "components": ["..."],
  "dependencies": ["..."],
  "routingStructure": "..."
}`;

      const completion = await this.getGroq().chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: summarizePrompt }],
        max_tokens: 1024,
        response_format: { type: "json_object" }
      });

      const generatedSummary = JSON.parse(completion.choices[0].message.content);

      await Project.findByIdAndUpdate(projectId, {
        $set: {
          "summary.projectPurpose": generatedSummary.projectPurpose || '',
          "summary.pages": generatedSummary.pages || [],
          "summary.components": generatedSummary.components || [],
          "summary.dependencies": generatedSummary.dependencies || [],
          "summary.routingStructure": generatedSummary.routingStructure || ''
        }
      });
      
      console.log(`✅ Project Summary updated for Project ${projectId}`);
    } catch (err) {
      console.error("Failed to update summary:", err.message);
    }
  }

  /**
   * Bulk Indexing of Files into MongoDB and Qdrant
   */
  async indexFiles(projectId, filesArray) {
    for (const file of filesArray) {
      // 1. Upsert to MongoDB
      const componentName = file.filePath.split('/').pop().split('.')[0];
      await File.findOneAndUpdate(
        { projectId, filePath: file.filePath },
        { 
          content: file.content, 
          componentName,
          lastModifiedByAI: Date.now() 
        },
        { upsert: true, new: true }
      );

      // 2. Upsert to Qdrant Vector DB
      await EmbeddingService.upsertEmbedding(projectId, file.filePath, componentName, file.content);
    }
    
    // 3. Update Project Summary
    await this.updateSummary(projectId);
  }
}

export default new ContextManager();
