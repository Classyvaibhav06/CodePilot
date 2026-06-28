import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Code2, Play, Rocket, Box, BrainCircuit, ArrowRight, CheckCircle2, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const [prompt, setPrompt] = useState('');
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleStartBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      navigate('/builder', { state: { initialPrompt: prompt } });
    } else {
      navigate('/builder');
    }
  };

  return (
    <div className="min-h-screen bg-paper-white text-deep-ink overflow-hidden relative font-suisse">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none" style={{ maskImage: 'linear-gradient(to bottom, black, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)' }}>
        <div className="bg-halftone-map" />
      </div>

      {/* Navbar */}
      <nav className="w-full relative z-50">
        <div className="max-w-[1200px] mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[18px] font-medium tracking-tight text-deep-ink">CodePilot</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-[14px] font-normal text-carbon hover:text-deep-indigo transition-colors">Features</a>
            <a href="#how-it-works" className="text-[14px] font-normal text-carbon hover:text-deep-indigo transition-colors">How it works</a>
            
            {user ? (
              <>
                <div className="flex items-center text-[14px] font-medium text-slate gap-1.5">
                  <UserCircle className="w-4 h-4" />
                  {user.email.split('@')[0]}
                </div>
                <button onClick={logout} className="text-[14px] font-normal text-carbon hover:text-deep-indigo transition-colors">
                  Sign out
                </button>
                <Link to="/builder" className="px-5 py-3 rounded-buttons bg-deep-indigo text-white text-[14px] font-medium shadow-subtle-box transition-all hover:bg-deep-indigo/90 flex items-center gap-1">
                  Dashboard <span className="opacity-80 text-lg leading-none">→</span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 rounded-buttons bg-transparent border border-mist text-[14px] font-medium text-deep-ink hover:text-deep-indigo transition-colors">
                  Sign in &gt;
                </Link>
                <Link to="/login" className="px-5 py-3 rounded-buttons bg-deep-indigo text-white text-[14px] font-medium shadow-subtle-box transition-all hover:bg-deep-indigo/90 flex items-center gap-1">
                  Get started <span className="opacity-80 text-lg leading-none">→</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-20 px-6 relative z-10">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-start"
          >
            <div className="mb-6 inline-flex items-center gap-2 bg-pale-cyan text-forest-teal px-3 py-1.5 rounded-badges">
              <span className="text-[11px] font-suissemono tracking-[0.5px] uppercase">Trusted at Scale</span>
            </div>

            <h1 className="text-[60px] font-light tracking-tight-display text-deep-ink mb-6 leading-[1.1]">
              Build Full-Stack Apps <br />
              <span className="text-fog">With AI</span>
            </h1>
            <p className="text-[18px] text-slate mb-10 max-w-xl leading-[1.43] tracking-[-0.18px]">
              Describe your idea. Generate code. Preview instantly. Deploy anywhere. 
              The future of software development operates with Swiss precision.
            </p>

            <form onSubmit={handleStartBuilding} className="relative flex items-center w-full max-w-lg bg-card-white rounded-buttons p-1 shadow-subtle-box border border-mist focus-within:border-deep-indigo transition-colors">
              <Sparkles className="w-5 h-5 text-deep-indigo ml-3 mr-2" />
              <input
                type="text"
                placeholder="Build a banking dashboard..."
                className="w-full bg-transparent border-none outline-none text-deep-ink placeholder:text-fog py-3 px-2 text-[16px] font-suisse"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <button
                type="submit"
                className="bg-deep-indigo text-white px-5 py-2.5 rounded-buttons text-[14px] font-medium shadow-subtle-box flex items-center gap-1 whitespace-nowrap"
              >
                Build <span className="opacity-80">→</span>
              </button>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            {/* Mockup Data Card */}
            <div className="bg-card-white rounded-cards p-6 shadow-hover-card w-full max-w-md ml-auto relative z-10 border border-mist">
              <div className="flex justify-between items-center mb-6">
                <span className="text-[14px] font-medium text-deep-ink flex items-center gap-2">
                  <div className="w-5 h-5 bg-deep-indigo rounded-sm flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                  Generated Component
                </span>
                <span className="text-[10px] font-sfmono text-slate uppercase tracking-wider">React / TS</span>
              </div>
              <div className="h-px w-full bg-mist mb-6" />
              <div className="text-[28px] font-light text-deep-ink tracking-tight-heading mb-2">
                &lt;DashboardLayout /&gt;
              </div>
              <p className="text-[12px] font-sfmono text-slate bg-paper-white p-3 rounded-md border border-mist mt-4">
                <span className="text-deep-indigo">import</span> {'{'} DashboardLayout {'}'} <span className="text-deep-indigo">from</span> '@codepilot/ui';
              </p>
            </div>
            
            <div className="absolute -bottom-10 -left-10 bg-graphite rounded-cards p-4 shadow-hover-card w-64 z-20">
               <p className="text-[10px] font-sfmono text-pale-cyan">
                 POST /api/v1/generate<br/>
                 Authorization: Bearer sk_test_...<br/>
                 <br/>
                 "prompt": "Build a banking dashboard"<br/>
                 "status": "success"
               </p>
            </div>
          </motion.div>

        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 max-w-[1200px] mx-auto">
        <div className="mb-16">
          <div className="mb-4 inline-flex items-center bg-pale-cyan text-forest-teal px-3 py-1.5 rounded-badges">
             <span className="text-[11px] font-suissemono tracking-[0.5px] uppercase">Developer First</span>
          </div>
          <h2 className="text-[40px] font-light text-deep-ink tracking-tight-display mb-4">Precision Engineered</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard 
            icon={<BrainCircuit className="w-4 h-4 text-deep-indigo" />}
            title="AI Code Generation"
            description="Transform natural language into high-quality, maintainable React components."
          />
          <FeatureCard 
            icon={<Play className="w-4 h-4 text-deep-indigo" />}
            title="Live Preview"
            description="See your app come to life in real-time as the AI writes the code."
          />
          <FeatureCard 
            icon={<Code2 className="w-4 h-4 text-deep-indigo" />}
            title="Smart File Editing"
            description="Pinpoint edits across multiple files simultaneously with context-aware AI."
          />
        </div>
      </section>

      {/* Case Study / Accent Card Section */}
      <section className="py-20 px-6 max-w-[1200px] mx-auto border-t border-mist">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-[28px] font-light text-deep-ink tracking-tight-heading mb-4">Moving ideas to production.</h2>
            <p className="text-[16px] text-slate mb-8 leading-[1.5]">
              Stop wrestling with boilerplate and configurations. CodePilot understands your entire codebase context to act as an autonomous pair programmer.
            </p>
            <div className="pl-4 border-l-2 border-mist">
              <span className="text-[40px] font-light text-fog leading-none">"</span>
              <p className="text-[18px] text-deep-ink font-normal mb-2 leading-[1.43]">CodePilot cut our frontend scaffolding time by 90%.</p>
              <p className="text-[14px] text-slate">Engineering Lead, Acme Corp</p>
            </div>
          </div>
          
          <div className="bg-card-white p-8 rounded-cards shadow-hover-card border border-mist relative">
            <div className="bg-ember-orange rounded-cards p-6 shadow-subtle-box">
              <div className="text-white font-suisse">
                <span className="text-[14px] font-medium opacity-90 block mb-2">Build Time Saved</span>
                <span className="text-[40px] font-light tracking-tight-heading block mb-6">4,250 hours</span>
                <div className="h-16 border-b border-white/20 relative">
                  <svg className="w-full h-full absolute bottom-0" preserveAspectRatio="none" viewBox="0 0 100 40">
                     <path d="M0,40 L10,30 L20,35 L30,20 L40,25 L50,10 L60,15 L70,5 L80,10 L90,0 L100,5" fill="none" stroke="white" strokeWidth="2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logo Strip */}
      <section className="py-10 px-6 max-w-[1200px] mx-auto mb-20">
         <div className="bg-card-white border border-mist rounded-cards py-8 px-12 flex justify-between items-center flex-wrap gap-8">
            <div className="text-[20px] font-bold text-fog tracking-tighter">Acme Corp</div>
            <div className="text-[20px] font-bold text-fog tracking-tighter">GlobalTech</div>
            <div className="text-[20px] font-bold text-fog tracking-tighter">Nexus</div>
            <div className="text-[20px] font-bold text-fog tracking-tighter">Stratos</div>
         </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t border-mist py-8 text-center text-slate text-[12px] font-suisse">
        <p>© 2026 CodePilot Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-card-white p-6 rounded-cards shadow-subtle-box border border-mist hover:shadow-hover-card transition-shadow duration-300">
      <div className="w-8 h-8 rounded-full bg-paper-white flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-[16px] font-medium text-deep-ink mb-2">{title}</h3>
      <p className="text-[14px] text-slate leading-[1.5]">{description}</p>
    </div>
  );
}
