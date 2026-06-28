import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Code2, Layout, Settings,
  PanelLeftClose, Send, RefreshCw,
  ExternalLink, UserCircle, Globe, ChevronDown,
  Monitor, LogOut, FileCode, Eye, ChevronRight, X, Trash2, Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
  useSandpack
} from '@codesandbox/sandpack-react';

// ─── Preview Header (must live inside SandpackProvider) ───────────────────────
const CustomPreviewHeader = ({
  isPreviewOpen, setPreviewOpen, activeTab, setActiveTab, allFiles
}: {
  isPreviewOpen: boolean;
  setPreviewOpen: (v: boolean) => void;
  activeTab: 'preview' | 'code';
  setActiveTab: (v: 'preview' | 'code') => void;
  allFiles: Record<string, string>;
}) => {
  const { sandpack } = useSandpack();
  const [isOpening, setIsOpening] = useState(false);

  // Use CodeSandbox's define API to create a real shareable sandbox from our files
  const openInNewTab = async () => {
    setIsOpening(true);
    try {
      // Build the files object in the format CodeSandbox expects
      const csFiles: Record<string, { content: string }> = {};
      Object.entries(allFiles).forEach(([path, content]) => {
        // CodeSandbox paths don't have leading slash
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        csFiles[cleanPath] = { content };
      });

      // Add package.json so CodeSandbox knows the dependencies
      csFiles['package.json'] = {
        content: JSON.stringify({
          name: 'codepilot-preview',
          version: '1.0.0',
          main: 'index.tsx',
          scripts: { start: 'react-scripts start' },
          dependencies: {
            'react': '18.2.0',
            'react-dom': '18.2.0',
            'react-scripts': '5.0.1',
            'lucide-react': 'latest',
            'framer-motion': 'latest',
            'clsx': 'latest',
            'react-router-dom': 'latest',
            'recharts': 'latest',
          },
        }, null, 2)
      };

      const response = await fetch('https://codesandbox.io/api/v1/sandboxes/define?json=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ files: csFiles }),
      });

      if (!response.ok) throw new Error('CodeSandbox API failed');
      const data = await response.json();
      window.open(`https://codesandbox.io/s/${data.sandbox_id}`, '_blank');
    } catch (err) {
      // Fallback: try the sandpack iframe src directly
      const clients = Object.values((sandpack as any).clients || {});
      if (clients.length > 0) {
        const url = (clients[0] as any)?.iframe?.src;
        if (url && !url.startsWith('about:')) { window.open(url, '_blank'); return; }
      }
      alert('Could not open preview. Please try again in a moment.');
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <div className="h-12 border-b border-mist bg-card-white flex items-center justify-between px-3 w-full shrink-0">
      <div className="flex items-center gap-1">
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${activeTab === 'preview' ? 'bg-paper-white text-deep-ink border border-mist shadow-subtle-box' : 'text-slate hover:text-deep-ink'}`}
        >
          <Eye className="w-3.5 h-3.5" /> Preview
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${activeTab === 'code' ? 'bg-paper-white text-deep-ink border border-mist shadow-subtle-box' : 'text-slate hover:text-deep-ink'}`}
        >
          <FileCode className="w-3.5 h-3.5" /> Files
        </button>
      </div>

      <div className="flex-1 max-w-[200px] mx-3 flex items-center justify-center bg-paper-white border border-mist rounded-[4px] h-7 px-2 text-[11px] text-slate gap-1.5">
        <Monitor className="w-3 h-3 shrink-0" />
        <span className="truncate">localhost:3000</span>
      </div>

      <div className="flex items-center gap-0.5">
        <button
          onClick={() => sandpack.dispatch({ type: 'refresh' })}
          className="p-1.5 hover:bg-paper-white rounded-md text-slate hover:text-deep-ink transition-colors"
          title="Refresh preview"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={openInNewTab}
          disabled={isOpening}
          className="p-1.5 hover:bg-paper-white rounded-md text-slate hover:text-deep-ink transition-colors disabled:opacity-40"
          title="Open in CodeSandbox"
        >
          {isOpening
            ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><RefreshCw className="w-3.5 h-3.5" /></motion.div>
            : <ExternalLink className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => setPreviewOpen(false)}
          className="p-1.5 hover:bg-paper-white rounded-md text-slate hover:text-deep-ink transition-colors ml-1"
          title="Close preview"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  isTyping?: boolean;
  reasoning?: string;
  editedFiles?: string[];
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function BuilderDashboard() {
  const location = useLocation();
  const initialPrompt = location.state?.initialPrompt || '';

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('codepilot_messages');
    if (saved) { try { return JSON.parse(saved); } catch (e) {} }
    return [{ id: '1', role: 'ai', content: 'Hello! I am CodePilot. What would you like to build today?' }];
  });

  const [sandpackFiles, setSandpackFiles] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('codepilot_files');
    if (saved) { try { return JSON.parse(saved); } catch (e) {} }
    return {
      '/App.tsx': `export default function App() {
  return (
    <div style={{ padding: 40, fontFamily: 'system-ui', textAlign: 'center', color: '#011821' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Welcome to CodePilot ✨</h1>
      <p style={{ color: '#7c7f88' }}>Describe what you want to build in the chat to see it live here!</p>
    </div>
  );
}`
    };
  });

  const [projectId, setProjectId] = useState<string | null>(() => localStorage.getItem('codepilot_projectId') || null);
  const [inputValue, setInputValue] = useState(initialPrompt);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isPreviewOpen, setPreviewOpen] = useState(true);
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewTab, setPreviewTab] = useState<'preview' | 'code'>('preview');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, token, logout } = useAuth();

  // ── Clear session / New Project ───────────────────────────────────────────
  const clearSession = () => {
    if (!window.confirm('Start a new project? This will clear the current chat and preview.')) return;
    localStorage.removeItem('codepilot_messages');
    localStorage.removeItem('codepilot_files');
    localStorage.removeItem('codepilot_projectId');
    setMessages([{ id: '1', role: 'ai', content: 'Hello! I am CodePilot. What would you like to build today?' }]);
    setSandpackFiles({
      '/App.tsx': `export default function App() {
  return (
    <div style={{ padding: 40, fontFamily: 'system-ui', textAlign: 'center' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Welcome to CodePilot ✨</h1>
      <p style={{ color: '#7c7f88', marginTop: 8 }}>Describe what you want to build in the chat!</p>
    </div>
  );
}`
    });
    setProjectId(null);
    setPreviewTab('preview');
  };

  // ── Self-Healing Sandbox Compiler Engine ──────────────────────────────────
  const { safeFiles, safeDependencies } = useMemo(() => {
    const deps: Record<string, string> = {
      'lucide-react': 'latest',
      'framer-motion': 'latest',
      'clsx': 'latest',
      'tailwind-merge': 'latest',
      'react-router-dom': 'latest',
      'recharts': 'latest',
    };

    const files = { ...sandpackFiles };
    const missingFiles = new Set<string>();

    Object.entries(files).forEach(([filePath, content]) => {
      // Extract NPM deps from imports
      const importRx = /import\s+(?:(?:\*\s+as\s+\w+)|(?:[^{]+\s*,\s*)?\{[^}]+\}|[^{]+)\s+from\s+['"]([^'"]+)['"]/g;
      let m;
      while ((m = importRx.exec(content)) !== null) {
        const pkg = m[1];
        if (!pkg.startsWith('.') && !pkg.startsWith('/') && pkg !== 'react' && pkg !== 'react-dom' && pkg !== 'react-dom/client') {
          const pkgName = pkg.startsWith('@') ? pkg.split('/').slice(0, 2).join('/') : pkg.split('/')[0];
          deps[pkgName] = 'latest';
        }
      }
      // Stub missing relative CSS files
      const cssRx = /import\s+['"]([^'"]+\.css)['"]/g;
      let cm;
      while ((cm = cssRx.exec(content)) !== null) {
        const cssPath = cm[1];
        let resolved = cssPath;
        if (cssPath.startsWith('./') || cssPath.startsWith('../')) {
          const dir = filePath.substring(0, filePath.lastIndexOf('/'));
          const parts = dir.split('/').filter(Boolean);
          cssPath.split('/').forEach(p => { if (p === '..') parts.pop(); else if (p !== '.') parts.push(p); });
          resolved = '/' + parts.join('/');
        }
        if (!files[resolved]) missingFiles.add(resolved);
      }
    });

    missingFiles.forEach(p => { files[p] = '/* auto-stubbed */'; });

    // Always force the entry point — inject Tailwind via the HTML attribute (most reliable)
    files['/index.tsx'] = `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

let container = document.getElementById("root");
if (!container) {
  container = document.createElement("div");
  container.id = "root";
  document.body.appendChild(container);
}
createRoot(container).render(<App />);`;

    return { safeFiles: files, safeDependencies: deps };
  }, [sandpackFiles]);

  // ── Persist to localStorage ───────────────────────────────────────────────
  useEffect(() => { localStorage.setItem('codepilot_messages', JSON.stringify(messages)); }, [messages]);
  useEffect(() => { localStorage.setItem('codepilot_files', JSON.stringify(sandpackFiles)); }, [sandpackFiles]);
  useEffect(() => { if (projectId) localStorage.setItem('codepilot_projectId', projectId); }, [projectId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (initialPrompt && messages.length === 1) handleSendMessage(initialPrompt); }, []);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text }]);
    setInputValue('');
    setIsGenerating(true);
    const typingId = Date.now().toString() + 'typing';
    setMessages(prev => [...prev, { id: typingId, role: 'ai', content: '', isTyping: true }]);

    try {
      const response = await fetch('/api/v1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: text, model: selectedModel })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || 'Unknown server error');

      const editedPaths: string[] = [];
      if (data.modifiedFiles?.length > 0) {
        setSandpackFiles(prev => {
          const next = { ...prev };
          data.modifiedFiles.forEach((file: any) => {
            let path = file.filePath;
            if (path.startsWith('src/')) path = path.substring(3);
            if (!path.startsWith('/')) path = '/' + path;
            next[path] = file.content;
            editedPaths.push(path);
          });
          return next;
        });
        if (projectId !== data.projectId) setProjectId(data.projectId);
        // Switch to preview tab when new code comes in
        setPreviewOpen(true);
        setPreviewTab('preview');
      }

      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== typingId);
        return [...filtered, {
          id: Date.now().toString() + 'ai',
          role: 'ai',
          content: data.message || 'Done! Check the preview.',
          reasoning: data.reasoning || undefined,
          editedFiles: editedPaths
        }];
      });
    } catch (error: any) {
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== typingId);
        return [...filtered, { id: Date.now().toString() + 'err', role: 'ai', content: `An error occurred: ${error.message}` }];
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // ── The Sandpack customSetup with Tailwind injected via HTML ─────────────
  const sandpackSetup = useMemo(() => ({
    dependencies: safeDependencies,
    // Inject Tailwind via the HTML file's head — this is the most reliable method
  }), [safeDependencies]);

  const sandpackOptions = useMemo(() => ({
    externalResources: ['https://cdn.tailwindcss.com'],
  }), []);

  return (
    <div className="h-screen w-full flex flex-col bg-paper-white text-deep-ink overflow-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Top Navbar ─────────────────────────────────────────────────── */}
      <header className="h-14 bg-card-white border-b border-mist flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="font-semibold tracking-tight text-deep-ink text-[16px]">CodePilot</span>
          </Link>
          <div className="h-4 w-px bg-mist" />
          <button className="flex items-center gap-2 text-[13px] text-carbon hover:bg-paper-white px-2 py-1 rounded-md transition-colors">
            My Workspace <ChevronDown className="w-3.5 h-3.5 text-slate" />
          </button>
        </div>
        <div className="flex items-center gap-3 relative">
          <button
            onClick={clearSession}
            className="flex items-center gap-1.5 border border-mist text-slate px-3 py-1.5 rounded-lg text-[13px] font-medium hover:border-ember-orange hover:text-ember-orange transition-colors"
            title="Start a new project"
          >
            <Plus className="w-3.5 h-3.5" /> New Project
          </button>
          <button className="flex items-center gap-2 bg-deep-indigo text-white px-4 py-1.5 rounded-lg text-[13px] font-medium shadow-subtle-box hover:bg-deep-indigo/90 transition-colors">
            <Globe className="w-3.5 h-3.5" /> Deploy
          </button>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!isDropdownOpen)}
              className="w-8 h-8 rounded-full bg-paper-white border border-mist flex items-center justify-center cursor-pointer hover:border-slate transition-colors text-[12px] font-semibold text-deep-ink uppercase"
            >
              {user?.email ? user.email.charAt(0) : <UserCircle className="w-5 h-5 text-slate" />}
            </button>
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  className="absolute right-0 top-10 w-52 bg-card-white border border-mist rounded-xl shadow-xl py-1 z-50"
                >
                  <div className="px-4 py-2.5 border-b border-mist">
                    <p className="text-[12px] text-slate truncate">{user?.email}</p>
                  </div>
                  <button onClick={logout} className="w-full text-left px-4 py-2 text-[13px] text-ember-orange hover:bg-paper-white transition-colors flex items-center gap-2">
                    <LogOut className="w-3.5 h-3.5" /> Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ── Main Workspace ──────────────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden relative">

        {/* Left Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: isSidebarOpen ? 220 : 0, opacity: isSidebarOpen ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="border-r border-mist bg-card-white flex flex-col shrink-0 overflow-hidden"
        >
          <div className="p-3 flex flex-col gap-1 w-[220px]">
            <h3 className="text-[10px] font-mono text-slate uppercase tracking-widest mt-3 mb-2 px-2">Workspace</h3>
            <SidebarItem icon={<Layout className="w-4 h-4" />} label="Projects" active />
            <SidebarItem icon={<Code2 className="w-4 h-4" />} label="Templates" />
            <SidebarItem icon={<Settings className="w-4 h-4" />} label="Settings" />
          </div>
        </motion.aside>

        {/* Center Panel (Chat) */}
        <section className="flex-1 flex flex-col min-w-[280px] border-r border-mist bg-paper-white">
          {/* Chat Toolbar */}
          <div className="h-12 border-b border-mist flex items-center px-3 justify-between bg-card-white shrink-0">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-1.5 hover:bg-paper-white rounded-md text-slate hover:text-deep-ink transition-colors" title="Toggle sidebar">
              <PanelLeftClose className={`w-4 h-4 transition-transform ${!isSidebarOpen ? 'rotate-180' : ''}`} />
            </button>

            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="bg-paper-white border border-mist rounded-md px-2 py-1 text-[12px] text-slate outline-none hover:border-slate transition-colors focus:border-deep-ink"
            >
              <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Groq)</option>
              <option value="deepseek-r1-distill-llama-70b">DeepSeek R1 70B (Groq)</option>
              <option value="deepseek-ai/deepseek-v4-flash">DeepSeek V4 Flash (NVIDIA)</option>
            </select>

            {/* Toggle preview panel button — always visible */}
            <button
              onClick={() => setPreviewOpen(!isPreviewOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors border ${isPreviewOpen ? 'bg-paper-white border-mist text-slate' : 'bg-deep-indigo border-deep-indigo text-white shadow-subtle-box'}`}
              title={isPreviewOpen ? 'Hide preview' : 'Show preview'}
            >
              <Eye className="w-3.5 h-3.5" />
              {isPreviewOpen ? 'Hide' : 'Preview'}
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5" style={{ scrollbarWidth: 'thin' }}>
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm ${msg.role === 'ai' ? 'bg-deep-indigo text-white' : 'bg-card-white border border-mist text-slate'}`}>
                  {msg.role === 'ai' ? <Sparkles className="w-4 h-4" /> : <UserCircle className="w-4 h-4" />}
                </div>
                <div className={`flex flex-col gap-1.5 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[11px] text-slate">{msg.role === 'ai' ? 'CodePilot' : 'You'}</span>
                  {msg.reasoning && (
                    <details className="mb-1 text-[11px] text-slate bg-paper-white/50 border border-mist rounded-lg p-2 max-w-full cursor-pointer hover:bg-card-white transition-colors">
                      <summary className="font-semibold text-carbon flex items-center gap-1 select-none outline-none">
                        🧠 Thought Process
                      </summary>
                      <div className="mt-1.5 pt-1.5 border-t border-mist/50 whitespace-pre-wrap font-mono text-[10.5px] leading-relaxed pl-1.5 border-l-2 border-slate text-slate">
                        {msg.reasoning}
                      </div>
                    </details>
                  )}
                  <div className={`p-3.5 rounded-xl text-[13px] leading-relaxed border border-mist shadow-subtle-box ${msg.role === 'user' ? 'bg-card-white text-deep-ink rounded-tr-sm' : 'bg-card-white text-deep-ink rounded-tl-sm'}`}>
                    {msg.isTyping ? (
                      <div className="flex gap-1 items-center h-5">
                        {[0, 0.2, 0.4].map((d, i) => (
                          <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: d }} className="w-1.5 h-1.5 bg-fog rounded-full" />
                        ))}
                      </div>
                    ) : msg.content}
                  </div>
                  {/* Edited files badge */}
                  {msg.editedFiles && msg.editedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {msg.editedFiles.map(f => (
                        <button
                          key={f}
                          onClick={() => { setPreviewOpen(true); setPreviewTab('code'); }}
                          className="flex items-center gap-1 text-[10px] bg-paper-white border border-mist rounded-md px-2 py-0.5 text-slate hover:border-deep-indigo hover:text-deep-ink transition-colors"
                        >
                          <FileCode className="w-3 h-3" />
                          {f.split('/').pop()}
                          <ChevronRight className="w-3 h-3 opacity-50" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-paper-white border-t border-mist shrink-0">
            {messages.length === 1 && !inputValue && (
              <div className="flex flex-wrap gap-2 mb-3">
                {['Build a banking dashboard', 'Create a SaaS landing page', 'Design an API console'].map(p => (
                  <button key={p} onClick={() => setInputValue(p)} className="text-[11px] bg-card-white border border-mist hover:border-deep-indigo text-carbon px-2.5 py-1 rounded-full transition-colors flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-deep-indigo" /> {p}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-end bg-card-white border border-mist rounded-xl focus-within:border-deep-indigo transition-colors p-2 shadow-subtle-box gap-2">
              <textarea
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(inputValue); } }}
                placeholder="Ask CodePilot to build something..."
                className="flex-1 bg-transparent border-none outline-none resize-none max-h-32 min-h-[40px] text-[13px] p-1.5 text-deep-ink placeholder:text-fog"
                rows={1}
                disabled={isGenerating}
              />
              <button
                onClick={() => handleSendMessage(inputValue)}
                disabled={!inputValue.trim() || isGenerating}
                className="p-2 rounded-lg bg-deep-indigo hover:bg-deep-indigo/90 text-white shadow-subtle-box disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
              >
                {isGenerating
                  ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><RefreshCw className="w-4 h-4" /></motion.div>
                  : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </section>

        {/* Right Panel (Live Preview) */}
        <AnimatePresence initial={false}>
          {isPreviewOpen && (
            <motion.section
              key="preview-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '50%', opacity: 1, minWidth: 380 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-paper-white flex flex-col z-0 overflow-hidden"
            >
              <div className="flex-1 w-full relative overflow-hidden flex flex-col">
                {messages.length > 1 ? (
                  <div className="w-full h-full [&_.sp-layout]:h-full [&_.sp-layout]:rounded-none [&_.sp-layout]:border-none">
                    <SandpackProvider
                      template="react-ts"
                      theme="light"
                      files={safeFiles}
                      customSetup={sandpackSetup}
                      options={sandpackOptions}
                    >
                      <CustomPreviewHeader
                        isPreviewOpen={isPreviewOpen}
                        setPreviewOpen={setPreviewOpen}
                        activeTab={previewTab}
                        setActiveTab={setPreviewTab}
                        allFiles={safeFiles}
                      />
                      <SandpackLayout className="h-[calc(100vh-104px)]">
                        {previewTab === 'preview' ? (
                          <SandpackPreview showNavigator={false} showOpenInCodeSandbox={false} className="h-full" />
                        ) : (
                          <SandpackCodeEditor showTabs showLineNumbers className="h-full" />
                        )}
                      </SandpackLayout>
                    </SandpackProvider>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-fog gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-card-white border border-mist flex items-center justify-center shadow-subtle-box">
                      <Layout className="w-8 h-8 opacity-30" />
                    </div>
                    <p className="text-[13px]">Describe your app to start the live preview.</p>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors w-full ${active ? 'bg-paper-white text-deep-ink border border-mist shadow-subtle-box' : 'text-slate hover:text-deep-ink hover:bg-paper-white border border-transparent'}`}>
      {icon} {label}
    </button>
  );
}
