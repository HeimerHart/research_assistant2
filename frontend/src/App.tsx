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
  BookMarked
} from 'lucide-react';

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
}

const FEATURED_TOPICS = [
  {
    title: "Quantum Supremacy & Post-Quantum Cryptography",
    authors: "DR. A. VANCE & L. BALUO",
    category: "Computing & Security",
    words: 1420,
    gradient: "from-[#a5c4ec] via-[#cde2f8] to-[#9ebde8]",
    cardBg: "bg-[#e8f1fc]",
    accent: "text-blue-900",
  },
  {
    title: "Solid-State Battery Breakthroughs in Mobility",
    authors: "DOROTHEA & SPINOCHIO",
    category: "Energy Storage",
    words: 980,
    gradient: "from-[#e8907f] via-[#f4a99b] to-[#dc7d6c]",
    cardBg: "bg-[#fceeed]",
    accent: "text-rose-950",
  },
  {
    title: "Multi-Agent Consensus & Emergent Alignment",
    authors: "J. H. JOHNSTON & LOK WA U",
    category: "Autonomous Systems",
    words: 1150,
    gradient: "from-[#f4be7a] via-[#f7d49f] to-[#e8ab60]",
    cardBg: "bg-[#fdf6ec]",
    accent: "text-amber-950",
  },
  {
    title: "Decentralized Edge Robotics Navigation",
    authors: "ALYSSAH TO & E. CHURCHILL",
    category: "Robotics & Space",
    words: 840,
    gradient: "from-[#c1b5ea] via-[#ded7f7] to-[#b3a4e5]",
    cardBg: "bg-[#f4f1fc]",
    accent: "text-purple-950",
  }
];

const AGENTS = [
  {
    step: 1,
    name: "Research Specialist",
    role: "Literature Retrieval",
    description: "Searches the Serper index, scrapes primary sources, and cross-references data."
  },
  {
    step: 2,
    name: "Data Analyst",
    role: "Information Verification",
    description: "Evaluates empirical metrics, finds consensus patterns, and structures notes."
  },
  {
    step: 3,
    name: "Content Writer",
    role: "Editorial Compilation",
    description: "Composes the comprehensive report with citations and executive brief."
  }
];

export default function App() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [report, setReport] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'words'>('recent');

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
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleStartResearch = async (selectedTopic?: string) => {
    const query = (selectedTopic || topic).trim();
    if (!query || loading) return;

    if (selectedTopic) setTopic(selectedTopic);
    setLoading(true);
    setLogs([]);
    setReport(null);
    setActiveStep(1);

    try {
      const response = await fetch('/api/research/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: query }),
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

                if (text.includes('Research Specialist') || text.includes('SerperDevTool') || text.includes('search')) {
                  setActiveStep(1);
                } else if (text.includes('Data Analyst') || text.includes('analyz')) {
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
                  report: data.content
                };
                setHistory((prev) => [newHistoryItem, ...prev.filter(h => h.topic !== query).slice(0, 8)]);
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
    link.download = `${topic.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_document.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#fbfbf9] text-[#111110] flex flex-col font-sans selection:bg-[#d8f3dc] selection:text-[#1b4332]">
      {/* Editorial Header Navigation */}
      <header className="border-b border-[#e5e5df] bg-[#fbfbf9] sticky top-0 z-40 px-8 py-3">
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
      <section className="pt-14 pb-8 px-6 text-center max-w-4xl mx-auto flex flex-col items-center">
        <h1 className="text-5xl md:text-6xl font-normal tracking-tight text-black mb-6 uppercase" style={{ fontFamily: 'var(--font-serif)' }}>
          SWITCH-LIT <br /> LIBRARY
        </h1>

        {/* Playful Book Arc Vector Illustration */}
        <div className="w-full max-w-md my-4 relative h-28 flex items-end justify-center gap-1.5 select-none pointer-events-none">
          <div className="w-8 h-16 bg-[#b2c8e3] rounded-t-sm border border-black transform -rotate-12" />
          <div className="w-9 h-20 bg-[#428076] rounded-t-sm border border-black transform -rotate-6" />
          <div className="w-9 h-24 bg-[#dc6553] rounded-t-sm border border-black transform -rotate-2" />
          <div className="w-10 h-26 bg-[#f7d665] rounded-t-sm border border-black" />
          {/* Open center book */}
          <div className="w-16 h-28 bg-[#f5f5ee] border-t-2 border-r-2 border-l-2 border-black rounded-t-full flex items-center justify-center relative overflow-hidden">
            <div className="w-8 h-16 border-2 border-black rounded-t-full bg-[#cb4e3c]" />
          </div>
          <div className="w-10 h-24 bg-[#498273] rounded-t-sm border border-black transform rotate-2" />
          <div className="w-9 h-22 bg-[#f48a97] rounded-t-sm border border-black transform rotate-6" />
          <div className="w-9 h-18 bg-[#ec8353] rounded-t-sm border border-black transform rotate-12" />
        </div>

        <p className="text-lg md:text-xl text-[#3d3d38] font-serif italic mt-2">
          Welcome to our public library of the collective imagination.
        </p>

        {/* Query Input Box */}
        <div className="w-full max-w-2xl mt-8">
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
              placeholder="What topic shall the collective examine today?..."
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
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Researching...
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

      {/* Featured Research Cards (Visual match to book covers) */}
      <section className="max-w-6xl mx-auto px-8 w-full mt-6 mb-10">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#111110]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-black">
            Featured Inquiries & Stories
          </h3>
          <div className="flex items-center gap-1.5">
            <button className="w-6 h-6 rounded border border-[#d8d8d2] flex items-center justify-center text-[#888880] hover:border-black hover:text-black">
              ←
            </button>
            <button className="w-6 h-6 rounded border border-[#d8d8d2] flex items-center justify-center text-[#888880] hover:border-black hover:text-black">
              →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURED_TOPICS.map((item, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -4 }}
              onClick={() => handleStartResearch(item.title)}
              className="flex flex-col cursor-pointer group"
            >
              {/* Art Cover Box */}
              <div
                className={`h-64 rounded-xl border border-black/10 overflow-hidden relative shadow-sm transition-shadow group-hover:shadow-md bg-gradient-to-b ${item.gradient} p-4 flex flex-col justify-between`}
              >
                {/* Horizontal stripes texture simulation */}
                <div className="absolute inset-0 opacity-15 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_8px,#000_8px,#000_16px)]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-black/70 bg-white/40 px-2 py-0.5 rounded backdrop-blur-sm self-start">
                  {item.category}
                </span>

                <div className="w-8 h-8 rounded-full bg-white/80 border border-black/20 flex items-center justify-center text-black/70 self-end">
                  <Bookmark className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Caption */}
              <div className="mt-2.5">
                <h4 className="text-[13px] font-semibold text-black tracking-tight group-hover:underline line-clamp-1">
                  {item.title}
                </h4>
                <p className="text-[10px] font-mono text-[#666660] uppercase mt-0.5">
                  written by {item.authors}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Main Research Workplace (Agents + Live Output) */}
      <section className="max-w-6xl mx-auto px-8 w-full pb-16 grid grid-cols-1 lg:grid-cols-12 gap-8">
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
                  The agents will print source searches and rationale here...
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
                  Manuscript / Findings
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
                    Submit an inquiry or select a featured title above to begin drafting the report.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Archive / Bottom Table (Matches image list view) */}
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

      {/* Configuration Modal */}
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
                <div className="space-y-4 text-xs">
                  <div>
                    <span className="text-[#666660] block mb-1">Serper API Key:</span>
                    <span className="font-mono bg-[#f5f5f0] p-2 rounded block border border-[#e5e5df]">
                      {config.has_serper ? 'Active & Ready' : 'Missing'}
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
