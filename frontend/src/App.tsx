import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Copy,
  Check,
  Download,
  Terminal,
  BookOpen,
  Maximize2,
  Minimize2,
  ArrowRight,
  Sliders,
  Bookmark,
  BookMarked,
  MessageSquare,
  X,
  ExternalLink,
  Send,
  Loader2,
  Trash2,
  Sparkles
} from 'lucide-react';

interface AcademicPaper {
  id: string;
  title: string;
  authors: string;
  abstract: string;
  published: string;
  source: string;
  venue?: string;
  pdf_url?: string;
  url?: string;
  doi?: string;
}

interface ConfigStatus {
  has_serper: boolean;
  has_groq: boolean;
  has_openai: boolean;
  research_agent_llm: string;
  analyst_agent_llm: string;
  writer_agent_llm: string;
}

interface HistoryItem {
  id: string;
  topic: string;
  timestamp: string;
  wordCount: number;
  report: string;
  papers?: AcademicPaper[];
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citations?: { title: string; source: string; url?: string }[];
}

const DEFAULT_FEATURED: AcademicPaper[] = [
  {
    id: 'feat_1',
    title: 'Quantum Supremacy & Post-Quantum Cryptography',
    authors: 'DR. A. VANCE & L. BALUO',
    abstract: 'Investigates lattice-based post-quantum algorithms against Shor algorithm fault-tolerant quantum computers.',
    published: '2026-03-12',
    source: 'arXiv',
    venue: 'Computing & Security',
    pdf_url: 'https://arxiv.org/abs/2403.00001',
    url: 'https://arxiv.org/abs/2403.00001',
  },
  {
    id: 'feat_2',
    title: 'Solid-State Battery Electrolytes in Electric Mobility',
    authors: 'DOROTHEA & SPINOCHIO',
    abstract: 'Synthesizes sulfide-based solid electrolytes for extreme temperature commercial EV battery packs.',
    published: '2026-02-18',
    source: 'Zenodo',
    venue: 'Energy Storage',
    pdf_url: 'https://zenodo.org',
    url: 'https://zenodo.org',
  },
  {
    id: 'feat_3',
    title: 'Multi-Agent Consensus & Emergent Alignment',
    authors: 'J. H. JOHNSTON & LOK WA U',
    abstract: 'Evaluates Game-Theoretic coordination across heterogeneous LLM multi-agent swarms.',
    published: '2026-01-20',
    source: 'OpenAlex',
    venue: 'Autonomous Systems',
    pdf_url: 'https://openalex.org',
    url: 'https://openalex.org',
  },
  {
    id: 'feat_4',
    title: 'Decentralized Edge Robotics Navigation Without GPS',
    authors: 'ALYSSAH TO & E. CHURCHILL',
    abstract: 'Presents neuromorphic visual odometry for sub-surface exploration without global positioning satellites.',
    published: '2025-11-14',
    source: 'arXiv',
    venue: 'Robotics & Space',
    pdf_url: 'https://arxiv.org/abs/2402.00001',
    url: 'https://arxiv.org/abs/2402.00001',
  }
];

const CARD_STYLES = [
  { gradient: 'from-[#a5c4ec] via-[#cde2f8] to-[#9ebde8]', category: 'COMPUTING & SECURITY' },
  { gradient: 'from-[#e8907f] via-[#f4a99b] to-[#dc7d6c]', category: 'ENERGY STORAGE' },
  { gradient: 'from-[#f4be7a] via-[#f7d49f] to-[#e8ab60]', category: 'AUTONOMOUS SYSTEMS' },
  { gradient: 'from-[#c1b5ea] via-[#ded7f7] to-[#b3a4e5]', category: 'ROBOTICS & SPACE' }
];

const AGENTS = [
  { step: 1, name: 'Research Specialist', role: 'arXiv & Zenodo Discovery', desc: 'Queries academic indexes, downloads open-access research, and extracts citations.' },
  { step: 2, name: 'Data Analyst', role: 'Information Verification', desc: 'Cross-checks methodology, statistical claims, and empirical benchmarks.' },
  { step: 3, name: 'Content Writer', role: 'Editorial Compilation', desc: 'Authors comprehensive literature synthesis with inline citations and references.' }
];

export default function App() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoveredPapers, setDiscoveredPapers] = useState<AcademicPaper[]>(DEFAULT_FEATURED);
  const [selectedPaperForModal, setSelectedPaperForModal] = useState<AcademicPaper | null>(null);

  const [logs, setLogs] = useState<string[]>([]);
  const [report, setReport] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'words'>('recent');

  // Interactive RAG Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('switchlit_chat_messages');
      return saved ? JSON.parse(saved) : [
        {
          id: 'welcome',
          sender: 'assistant',
          text: 'Welcome! I am your Academic Reading Advisor. Once literature is discovered or synthesized, you can ask me to compare methodologies, clarify findings, or extract specific experimental parameters.'
        }
      ];
    } catch {
      return [];
    }
  });
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Persistent History
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('switchlit_history');
      return saved ? JSON.parse(saved) : [
        {
          id: 'sample-1',
          topic: 'Artificial General Intelligence architectures in 2026',
          timestamp: '2026-11-01',
          wordCount: 840,
          report: '# Artificial General Intelligence Architectures (2026)\n\n### Executive Summary\nCurrent frontier models demonstrate multimodal integration with dynamic reinforcement learning loops.'
        }
      ];
    } catch {
      return [];
    }
  });

  const logContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => console.error('Failed to load config', err));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('switchlit_history', JSON.stringify(history));
    } catch (e) {
      console.error(e);
    }
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem('switchlit_chat_messages', JSON.stringify(chatMessages));
    } catch (e) {
      console.error(e);
    }
  }, [chatMessages]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  // Step 1: Discover candidate papers from arXiv, Zenodo & OpenAlex
  const handleDiscover = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setDiscovering(true);
    try {
      const res = await fetch('/api/academic/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: searchQuery, limit: 4 })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.papers && data.papers.length > 0) {
          setDiscoveredPapers(data.papers);
        }
      }
    } catch (err) {
      console.error('Academic discovery failed', err);
    } finally {
      setDiscovering(false);
    }
  };

  // Step 2: Full Synthesis and RAG Execution
  const handleStartResearch = async (selectedTopic?: string, targetPapers?: AcademicPaper[]) => {
    const query = (selectedTopic || topic).trim();
    if (!query || loading) return;

    if (selectedTopic) setTopic(selectedTopic);
    setLoading(true);
    setLogs([]);
    setReport(null);
    setActiveStep(1);

    // Auto-discover candidate papers to populate featured shelf
    handleDiscover(query);

    try {
      const response = await fetch('/api/research/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: query,
          papers: targetPapers || (discoveredPapers.length > 0 ? discoveredPapers : undefined)
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to connect to research stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.replace('data: ', ''));
              if (data.type === 'log') {
                const text = data.content;
                setLogs((prev) => [...prev, text]);

                if (text.includes('Academic Desk') || text.includes('Research Specialist') || text.includes('search')) {
                  setActiveStep(1);
                } else if (text.includes('Data Analyst') || text.includes('analyz') || text.includes('Verification')) {
                  setActiveStep(2);
                } else if (text.includes('Content Writer') || text.includes('writing') || text.includes('report')) {
                  setActiveStep(3);
                }
              } else if (data.type === 'complete') {
                setReport(data.content);
                setActiveStep(4);

                const count = data.content.split(/\s+/).filter(Boolean).length;
                const newHistoryItem: HistoryItem = {
                  id: Date.now().toString(),
                  topic: query,
                  timestamp: new Date().toISOString().split('T')[0],
                  wordCount: count,
                  report: data.content,
                  papers: discoveredPapers
                };
                setHistory((prev) => [newHistoryItem, ...prev.filter(h => h.topic !== query).slice(0, 9)]);
              }
            } catch (err) {
              console.error('Error parsing SSE event', err);
            }
          }
        }
      }
    } catch (err: any) {
      setLogs((prev) => [...prev, `[System Error]: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Interactive RAG Chat
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userQ = chatInput.trim();
    setChatInput('');
    const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text: userQ };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/papers/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userQ, topic: topic || undefined })
      });
      if (res.ok) {
        const data = await res.json();
        const botMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: data.answer,
          citations: data.citations
        };
        setChatMessages((prev) => [...prev, botMsg]);
      } else {
        throw new Error('Failed to query paper advisor');
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), sender: 'assistant', text: `Advisor error: ${err.message}` }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadReport = () => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${topic.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_brief.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearChat = () => {
    setChatMessages([]);
    localStorage.removeItem('switchlit_chat_messages');
  };

  return (
    <div className="min-h-screen bg-[#fbfbf9] text-[#111110] flex flex-col font-sans selection:bg-[#d8f3dc] selection:text-[#1b4332]">
      {/* Editorial Header Navigation */}
      <header className="border-b border-[#e5e5df] bg-[#fbfbf9] sticky top-0 z-30 px-8 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-10">
            <span className="font-bold text-xl tracking-tight text-black cursor-pointer font-serif-heading">
              Switch-Lit
            </span>
            <nav className="hidden md:flex items-center gap-6 text-[13px] text-[#4a4a46] font-medium">
              <span className="hover:text-black cursor-pointer">Start a Story</span>
              <span className="hover:text-black cursor-pointer">Subrosa</span>
              <span className="hover:text-black cursor-pointer">Prompts</span>
              <span className="bg-[#e9ede8] text-black px-2.5 py-1 rounded-md cursor-pointer font-semibold">
                Library
              </span>
              <span className="hover:text-black cursor-pointer">About</span>
              <span className="hover:text-black cursor-pointer">FAQ</span>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {config && (
              <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${config.has_serper ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                  ● Serper: {config.has_serper ? 'Online' : 'Off'}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${config.has_groq ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  ● Groq: {config.has_groq ? 'Connected' : 'Off'}
                </span>
              </div>
            )}

            {/* RAG Chat Drawer Toggle */}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#efefe9] border border-black/15 text-xs font-semibold text-black transition-colors shadow-sm"
              title="Open Paper Advisor Chat"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
              <span>Ask Papers</span>
            </button>

            <button
              onClick={() => setShowConfigModal(true)}
              className="p-1.5 rounded-md hover:bg-[#efefe9] text-[#555550]"
              title="Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>

            <button className="bg-black hover:bg-[#222220] text-white text-[12px] font-semibold px-4 py-1.5 rounded-full transition-colors">
              Sign Up
            </button>
            <button className="text-[12px] font-semibold px-3 py-1.5 text-black hover:underline">
              Log in
            </button>
          </div>
        </div>
      </header>

      {/* Hero Header Section */}
      <section className="pt-12 pb-6 px-6 text-center max-w-4xl mx-auto flex flex-col items-center">
        <h1 className="text-5xl md:text-6xl font-normal tracking-tight text-black mb-5 uppercase" style={{ fontFamily: 'var(--font-serif)' }}>
          SWITCH-LIT <br /> LIBRARY
        </h1>

        {/* Book Arc Illustration */}
        <div className="w-full max-w-md my-3 relative h-28 flex items-end justify-center gap-1.5 select-none pointer-events-none">
          <div className="w-8 h-16 bg-[#b2c8e3] rounded-t-sm border border-black transform -rotate-12" />
          <div className="w-9 h-20 bg-[#428076] rounded-t-sm border border-black transform -rotate-6" />
          <div className="w-9 h-24 bg-[#dc6553] rounded-t-sm border border-black transform -rotate-2" />
          <div className="w-10 h-26 bg-[#f7d665] rounded-t-sm border border-black" />
          <div className="w-16 h-28 bg-[#f5f5ee] border-t-2 border-r-2 border-l-2 border-black rounded-t-full flex items-center justify-center relative overflow-hidden">
            <div className="w-8 h-16 border-2 border-black rounded-t-full bg-[#cb4e3c]" />
          </div>
          <div className="w-10 h-24 bg-[#498273] rounded-t-sm border border-black transform rotate-2" />
          <div className="w-9 h-22 bg-[#f48a97] rounded-t-sm border border-black transform rotate-6" />
          <div className="w-9 h-18 bg-[#ec8353] rounded-t-sm border border-black transform rotate-12" />
        </div>

        <p className="text-lg md:text-xl text-[#3d3d38] font-serif italic mt-1">
          Welcome to our public library of the collective imagination.
        </p>

        {/* Topic Input Box */}
        <div className="w-full max-w-2xl mt-7">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleStartResearch();
            }}
            className="flex items-center bg-white border border-[#111110] rounded-full p-1.5 shadow-[0_2px_0_0_#111110] hover:shadow-[0_3px_0_0_#111110] transition-all"
          >
            <div className="pl-4 text-[#888880]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Search arXiv, Zenodo, conference papers or enter a research topic..."
              className="flex-1 px-3 py-2 text-sm bg-transparent outline-none placeholder:text-[#999990] text-black font-sans"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="bg-black hover:bg-[#252523] text-white px-5 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Synthesizing...
                </>
              ) : (
                <>
                  <span>Begin</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Featured Research Papers Section (Direct visual match with user image) */}
      <section className="max-w-6xl mx-auto px-8 w-full mt-4 mb-8">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#111110]">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-black">
              Featured Inquiries & Research Literature
            </h3>
            {discovering && (
              <span className="text-[11px] font-mono text-emerald-700 flex items-center gap-1 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" /> Searching arXiv & Zenodo...
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleDiscover(topic || 'Machine Learning')}
              className="text-[11px] font-mono text-[#666660] hover:text-black px-2 py-0.5 border border-[#d8d8d2] rounded"
            >
              Refresh Deck
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {discoveredPapers.slice(0, 4).map((paper, idx) => {
            const style = CARD_STYLES[idx % CARD_STYLES.length];
            return (
              <motion.div
                key={paper.id || idx}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedPaperForModal(paper)}
                className="flex flex-col cursor-pointer group"
              >
                {/* Art Cover Box */}
                <div
                  className={`h-64 rounded-xl border border-black/15 overflow-hidden relative shadow-sm transition-shadow group-hover:shadow-md bg-gradient-to-b ${style.gradient} p-4 flex flex-col justify-between`}
                >
                  <div className="absolute inset-0 opacity-15 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_8px,#000_8px,#000_16px)]" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-black/80 bg-white/50 px-2 py-0.5 rounded backdrop-blur-sm self-start">
                    {paper.source || style.category}
                  </span>

                  <div className="w-8 h-8 rounded-full bg-white/80 border border-black/20 flex items-center justify-center text-black/70 self-end group-hover:bg-white transition-colors">
                    <Bookmark className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Caption */}
                <div className="mt-2.5">
                  <h4 className="text-[13px] font-semibold text-black tracking-tight group-hover:underline line-clamp-1">
                    {paper.title}
                  </h4>
                  <p className="text-[10px] font-mono text-[#666660] uppercase mt-0.5 truncate">
                    written by {paper.authors}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Main Research Workplace (Agents + Document Output) */}
      <section className="max-w-6xl mx-auto px-8 w-full pb-14 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Multi-Agent Process */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Agent Stepper */}
          <div className="bg-white rounded-xl border border-[#e5e5df] p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e5df] mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-black">
                Collaborative Desk
              </span>
              <span className="text-[11px] font-mono text-[#777770]">
                {loading ? 'Agents in session' : 'Standby'}
              </span>
            </div>

            <div className="space-y-3">
              {AGENTS.map((agent) => {
                const isActive = activeStep === agent.step;
                const isPassed = activeStep > agent.step;

                return (
                  <div
                    key={agent.step}
                    className={`p-3.5 rounded-lg border transition-all ${
                      isActive
                        ? 'bg-[#f4f7f4] border-[#1b4332] shadow-sm'
                        : isPassed
                        ? 'bg-[#fbfbf9] border-[#dcdcd4] text-[#444440]'
                        : 'bg-white border-[#ecece6] text-[#888880]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-5 h-5 rounded-full text-[11px] font-mono flex items-center justify-center font-bold ${
                          isActive
                            ? 'bg-black text-white'
                            : isPassed
                            ? 'bg-[#d8f3dc] text-[#1b4332]'
                            : 'bg-[#efefe9] text-[#777770]'
                        }`}>
                          {isPassed ? '✓' : agent.step}
                        </span>
                        <div>
                          <h5 className="text-xs font-semibold text-black">{agent.name}</h5>
                          <p className="text-[11px] text-[#666660]">{agent.role}</p>
                        </div>
                      </div>
                      {isActive && (
                        <span className="text-[10px] font-mono font-bold bg-[#d8f3dc] text-[#1b4332] px-2 py-0.5 rounded-full animate-pulse">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Terminal Logs */}
          <div className="bg-white rounded-xl border border-[#e5e5df] p-4 flex flex-col h-56 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-[#e5e5df] mb-2">
              <span className="text-[11px] font-mono font-medium text-black flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#555550]" /> Research Log Transcript
              </span>
              <span className="text-[10px] font-mono text-[#888880]">
                {loading ? 'transcribing...' : 'idle'}
              </span>
            </div>

            <div
              ref={logContainerRef}
              className="font-mono text-[11px] text-[#444440] overflow-y-auto space-y-1 flex-1 pr-1"
            >
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[#999990] italic text-xs font-sans">
                  The agents will print paper reading, citations and rationale here...
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="whitespace-pre-wrap leading-relaxed">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Editorial Library Document */}
        <div className={`flex flex-col ${isFullScreen ? 'fixed inset-0 z-50 bg-[#fbfbf9] p-8' : 'lg:col-span-7'}`}>
          <div className="bg-white rounded-xl border border-[#e5e5df] shadow-sm flex flex-col h-full min-h-[580px] overflow-hidden">
            {/* Document Header */}
            <div className="px-6 py-4 border-b border-[#e5e5df] bg-[#fafaf7] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-black" />
                <h3 className="font-semibold text-xs tracking-wider uppercase text-black">
                  Manuscript / Synthesis
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {report && (
                  <>
                    <button
                      onClick={copyToClipboard}
                      className="px-3 py-1 rounded-md bg-white hover:bg-[#efefe9] border border-[#dcdcd4] text-[11px] font-medium text-black flex items-center gap-1.5 shadow-sm"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={downloadReport}
                      className="px-3 py-1 rounded-md bg-black text-white hover:bg-[#222220] text-[11px] font-medium flex items-center gap-1.5"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download .md</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="p-1 rounded hover:bg-[#efefe9] text-[#777770]"
                >
                  {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="flex-1 p-8 overflow-y-auto leading-relaxed">
              {report ? (
                <div className="prose prose-slate max-w-none prose-headings:font-serif prose-headings:text-black prose-p:text-[#333330] prose-p:text-[15px] prose-p:leading-7 prose-a:text-[#1b4332] prose-a:underline prose-li:text-[#333330]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#888880]">
                  <BookMarked className="w-10 h-10 mb-3 text-[#bbbbb2]" />
                  <h4 className="font-serif text-xl text-black font-normal mb-1">
                    The Library Catalog is Empty
                  </h4>
                  <p className="text-xs text-[#777770] max-w-xs font-sans">
                    Submit an inquiry or click any paper card above to start RAG synthesis across arXiv and Zenodo.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Archive / Bottom Table */}
      <section className="max-w-6xl mx-auto px-8 w-full pb-20">
        <div className="flex items-center justify-center gap-2 my-8">
          <span className="text-[11px] font-mono font-bold text-[#666660] uppercase tracking-wider mr-2">
            Sort by:
          </span>
          <button
            onClick={() => setSortBy('recent')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              sortBy === 'recent'
                ? 'bg-[#d8f3dc] text-[#1b4332] border-[#b7e4c7] font-semibold'
                : 'bg-white text-[#777770] border-[#e5e5df]'
            }`}
          >
            Most recent
          </button>
          <button
            onClick={() => setSortBy('words')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              sortBy === 'words'
                ? 'bg-[#d8f3dc] text-[#1b4332] border-[#b7e4c7] font-semibold'
                : 'bg-white text-[#777770] border-[#e5e5df]'
            }`}
          >
            Word count
          </button>
        </div>

        {/* Table View */}
        <div className="w-full border-t border-b border-[#111110] py-2">
          <div className="grid grid-cols-12 text-[11px] font-bold text-black uppercase tracking-wider py-1">
            <div className="col-span-2">Authors</div>
            <div className="col-span-6">Title</div>
            <div className="col-span-2 text-right">Word Count</div>
            <div className="col-span-2 text-right">Release Date</div>
          </div>

          <div className="divide-y divide-[#ecece6]">
            {history
              .slice()
              .sort((a, b) => (sortBy === 'words' ? b.wordCount - a.wordCount : 0))
              .map((row) => (
                <div
                  key={row.id}
                  onClick={() => {
                    setTopic(row.topic);
                    setReport(row.report);
                    if (row.papers) setDiscoveredPapers(row.papers);
                    setActiveStep(4);
                  }}
                  className="grid grid-cols-12 text-[12px] py-2.5 items-center hover:bg-[#f2f2ec] cursor-pointer transition-colors"
                >
                  <div className="col-span-2 text-[#666660] font-mono text-[11px] flex items-center gap-1.5">
                    <span>○○</span>
                    <span>AI Crew</span>
                  </div>
                  <div className="col-span-6 font-medium text-black truncate pr-4">
                    {row.topic}
                  </div>
                  <div className="col-span-2 text-right font-mono text-[#555550]">
                    {row.wordCount}
                  </div>
                  <div className="col-span-2 text-right font-mono text-[#555550]">
                    {row.timestamp}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* Paper Reader Modal (Triggered by clicking paper card) */}
      <AnimatePresence>
        {selectedPaperForModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-2xl bg-white border border-[#111110] rounded-2xl p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              <div className="flex items-start justify-between pb-3 border-b border-[#e5e5df] mb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold bg-[#d8f3dc] text-[#1b4332] px-2 py-0.5 rounded-full uppercase">
                    {selectedPaperForModal.source}
                  </span>
                  <h3 className="font-serif text-2xl text-black mt-2 leading-tight">
                    {selectedPaperForModal.title}
                  </h3>
                  <p className="text-xs font-mono text-[#666660] mt-1">
                    {selectedPaperForModal.authors} • {selectedPaperForModal.published}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPaperForModal(null)}
                  className="p-1 rounded hover:bg-[#efefe9] text-[#777770]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 pr-2 text-sm text-[#333330] leading-relaxed font-sans space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                    Abstract & Findings
                  </h4>
                  <p className="text-[13px] bg-[#f9f9f6] p-4 rounded-xl border border-[#ecece6]">
                    {selectedPaperForModal.abstract || 'Abstract content available via direct PDF access below.'}
                  </p>
                </div>

                {selectedPaperForModal.doi && (
                  <p className="text-xs font-mono text-[#666660]">
                    DOI: <span className="text-black">{selectedPaperForModal.doi}</span>
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-[#e5e5df] mt-4 flex items-center justify-between">
                <button
                  onClick={() => {
                    handleStartResearch(selectedPaperForModal.title, [selectedPaperForModal]);
                    setSelectedPaperForModal(null);
                  }}
                  className="px-4 py-2 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Synthesize This Paper</span>
                </button>

                <div className="flex items-center gap-2">
                  {selectedPaperForModal.pdf_url && (
                    <a
                      href={selectedPaperForModal.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-full bg-black text-white hover:bg-[#222220] text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </a>
                  )}

                  {selectedPaperForModal.url && (
                    <a
                      href={selectedPaperForModal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full border border-[#d8d8d2] hover:bg-[#efefe9] text-black"
                      title="Open Web Record"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Live RAG "Ask Papers" Drawer */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white border-l border-[#111110] shadow-2xl z-50 flex flex-col"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#e5e5df] bg-[#fafaf7] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-800" />
                <h3 className="font-semibold text-xs tracking-wider uppercase text-black">
                  Paper Advisor (RAG Chat)
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearChat}
                  className="p-1 rounded hover:bg-[#efefe9] text-[#777770]"
                  title="Clear Chat History"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="p-1 rounded hover:bg-[#efefe9] text-[#777770]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 font-sans text-xs">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-xl leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-black text-white'
                        : 'bg-[#f4f7f4] text-[#1b4332] border border-[#d8f3dc]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[#cce3de] text-[10px] space-y-0.5">
                        <span className="font-semibold block text-emerald-950">Grounded Excerpts:</span>
                        {msg.citations.map((c, i) => (
                          <div key={i} className="truncate text-emerald-800">
                            • {c.title} ({c.source})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-center gap-1.5 text-xs text-[#777770] font-mono italic">
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-700" />
                  Advisor querying indexed literature...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChatMessage} className="p-3 border-t border-[#e5e5df] bg-white flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about paper methodologies, data, or tips..."
                className="flex-1 text-xs border border-[#dcdcd4] rounded-lg px-3 py-2 outline-none focus:border-black font-sans"
                disabled={chatLoading}
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="p-2 rounded-lg bg-black text-white hover:bg-[#222220] disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white border border-[#111110] rounded-xl p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#e5e5df] mb-4">
                <h3 className="text-sm font-bold text-black uppercase tracking-wider">
                  Settings & Keys
                </h3>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="text-xs text-[#777770] hover:text-black font-semibold"
                >
                  Close
                </button>
              </div>

              {config && (
                <div className="space-y-4 text-xs font-sans">
                  <div>
                    <span className="text-[#666660] block mb-1">Academic Indices:</span>
                    <span className="font-mono bg-[#f5f5f0] p-2 rounded block border border-[#e5e5df]">
                      arXiv, Zenodo, OpenAlex (Active & Cached)
                    </span>
                  </div>
                  <div>
                    <span className="text-[#666660] block mb-1">Groq Engine Model:</span>
                    <span className="font-mono bg-[#f5f5f0] p-2 rounded block border border-[#e5e5df]">
                      {config.research_agent_llm}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
