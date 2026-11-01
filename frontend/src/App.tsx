import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Sparkles,
  Bot,
  FileText,
  Copy,
  Check,
  Download,
  Terminal,
  Activity,
  Layers,
  BookOpen,
  Compass,
  Clock,
  History,
  Trash2,
  Maximize2,
  Minimize2,
  Sliders,
  CheckCircle2
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
  report: string;
}

const SUGGESTED_TOPICS = [
  "Quantum Computing impact on Post-Quantum Cryptography in 2026",
  "Solid-State Battery breakthroughs for Commercial EVs",
  "Agentic AI multi-model reasoning architectures and benchmarks",
  "Autonomous edge robotics navigation without GPS"
];

const AGENTS = [
  {
    step: 1,
    name: "Research Specialist",
    role: "Information Discovery & Fact-Checking",
    icon: Search,
    color: "from-sky-500 to-blue-600",
    description: "Queries Serper API, parses search indices, and extracts source citations."
  },
  {
    step: 2,
    name: "Data Analyst",
    role: "Pattern Recognition & Synthesis",
    icon: Bot,
    color: "from-teal-500 to-cyan-600",
    description: "Structures qualitative and statistical findings, eliminates hallucinations."
  },
  {
    step: 3,
    name: "Content Writer",
    role: "Document Structure & Publication",
    icon: FileText,
    color: "from-indigo-500 to-blue-700",
    description: "Synthesizes comprehensive executive overview and bibliography."
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
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('research_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [searchDuration, setSearchDuration] = useState<number>(0);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => console.error('Failed to load config', err));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('research_history', JSON.stringify(history));
    } catch (e) {
      console.error(e);
    }
  }, [history]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Duration counter during research
  useEffect(() => {
    if (loading) {
      setSearchDuration(0);
      timerRef.current = setInterval(() => {
        setSearchDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading]);

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

                // Save to history
                const newHistoryItem: HistoryItem = {
                  id: Date.now().toString(),
                  topic: query,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  report: data.content
                };
                setHistory((prev) => [newHistoryItem, ...prev.slice(0, 9)]);
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
    link.download = `${topic.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_brief.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('research_history');
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200 flex flex-col font-sans selection:bg-sky-500/20 selection:text-sky-300">
      {/* Refined Navigation Bar */}
      <header className="h-16 border-b border-slate-800/80 bg-[#0c1220]/75 backdrop-blur-md sticky top-0 z-40 px-6">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-md shadow-sky-500/15">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-100 tracking-tight">Kalliope</span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Autonomous Multi-Agent Synthesis</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Indicators */}
            {config && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-medium text-slate-300">
                  <span className={`w-1.5 h-1.5 rounded-full ${config.has_serper ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400'}`} />
                  Serper Search
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-medium text-slate-300">
                  <span className={`w-1.5 h-1.5 rounded-full ${config.has_groq ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-500'}`} />
                  Groq Engine
                </div>
              </div>
            )}

            <button
              onClick={() => setShowConfigModal(!showConfigModal)}
              className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="System Configuration"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-7 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Left Column: Research Input, Agent Pipeline, Activity Stream */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Query Formulation Card */}
          <div className="p-5 rounded-xl bg-[#0f172a]/60 border border-slate-800/80 backdrop-blur-sm shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-sky-400" /> Research Topic
              </span>
              {loading && (
                <span className="text-xs font-mono text-sky-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 animate-spin" /> {formatSeconds(searchDuration)}
                </span>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleStartResearch();
              }}
              className="flex flex-col gap-3"
            >
              <div className="relative">
                <textarea
                  rows={2}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ask a technical or market question..."
                  className="w-full bg-[#0a0f1d] border border-slate-800 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-all resize-none font-sans"
                  disabled={loading}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={loading || !topic.trim()}
                  className="flex-1 py-2.5 px-4 rounded-lg text-xs font-medium bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Activity className="w-3.5 h-3.5 animate-spin" />
                      Agents Collaborating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Dispatch Research Crew
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Curated Suggested Inquiries */}
            {!loading && (
              <div className="mt-4 pt-4 border-t border-slate-800/60">
                <p className="text-[11px] font-medium text-slate-400 mb-2">Preset Inquiries:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_TOPICS.map((suggested, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleStartResearch(suggested)}
                      className="text-[11px] text-slate-400 hover:text-sky-300 bg-slate-900 hover:bg-slate-800/80 border border-slate-800/80 px-2.5 py-1 rounded-md text-left transition-colors truncate max-w-full"
                    >
                      {suggested}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sequential Agent Flow */}
          <div className="p-5 rounded-xl bg-[#0f172a]/60 border border-slate-800/80 backdrop-blur-sm shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" /> Crew Orchestration
              </span>
              <span className="text-[11px] font-mono text-slate-400">Sequential Tasking</span>
            </div>

            <div className="space-y-2.5 mt-1">
              {AGENTS.map((agent) => {
                const Icon = agent.icon;
                const isActive = activeStep === agent.step;
                const isPassed = activeStep > agent.step;

                return (
                  <motion.div
                    key={agent.step}
                    layout
                    transition={{ duration: 0.2 }}
                    className={`p-3 rounded-lg border transition-all ${
                      isActive
                        ? 'bg-sky-500/10 border-sky-500/40 shadow-sm shadow-sky-500/5'
                        : isPassed
                        ? 'bg-slate-900/80 border-slate-800/80 text-slate-300'
                        : 'bg-[#0a0f1d]/40 border-slate-800/40 text-slate-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-white ${
                          isActive
                            ? 'bg-sky-500'
                            : isPassed
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {isPassed ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-medium text-slate-200">{agent.name}</h4>
                          {isActive && (
                            <span className="text-[10px] font-mono text-sky-400 font-medium px-1.5 py-0.2 rounded bg-sky-500/15 animate-pulse">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{agent.role}</p>
                        {isActive && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/60 font-sans"
                          >
                            {agent.description}
                          </motion.p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Terminal / Realtime Log Stream */}
          <div className="p-4 rounded-xl bg-[#080d19] border border-slate-800/80 flex flex-col h-60 overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 mb-2">
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-sky-400" /> Pipeline Console
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {loading ? 'streaming stdout...' : 'ready'}
              </span>
            </div>

            <div
              ref={logContainerRef}
              className="font-mono text-[11px] text-slate-400 overflow-y-auto space-y-1.5 flex-1 pr-1 selection:bg-slate-700"
            >
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-600 italic font-sans text-xs">
                  Agent reasoning traces will stream here during kickoff...
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="whitespace-pre-wrap leading-relaxed text-slate-300">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* History Accordion */}
          {history.length > 0 && (
            <div className="p-4 rounded-xl bg-[#0f172a]/60 border border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-slate-400" /> Past Inquiries
                </span>
                <button
                  onClick={clearHistory}
                  className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>

              <div className="space-y-1.5 mt-2">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setTopic(item.topic);
                      setReport(item.report);
                      setActiveStep(4);
                    }}
                    className="w-full text-left p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/50 flex items-center justify-between group transition-colors"
                  >
                    <span className="text-xs text-slate-300 truncate max-w-[240px] font-medium group-hover:text-sky-300">
                      {item.topic}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">{item.timestamp}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Research Report View */}
        <div className={`flex flex-col ${isFullScreen ? 'fixed inset-0 z-50 bg-[#090d16] p-6' : 'lg:col-span-7'}`}>
          <div className="h-full min-h-[640px] rounded-xl bg-[#0f172a]/60 border border-slate-800/80 shadow-sm flex flex-col overflow-hidden backdrop-blur-sm">
            {/* Report Header Bar */}
            <div className="p-4 border-b border-slate-800/80 bg-[#0c1220]/75 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-400" />
                <h3 className="font-medium text-xs text-slate-200 tracking-wide uppercase">
                  Synthesized Brief
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {report && (
                  <>
                    <button
                      onClick={copyToClipboard}
                      className="px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors text-xs flex items-center gap-1.5 font-medium"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      onClick={downloadReport}
                      className="px-2.5 py-1.5 rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 transition-colors text-xs flex items-center gap-1.5 font-medium"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .md</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Toggle Fullscreen"
                >
                  {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="flex-1 p-7 overflow-y-auto font-sans leading-relaxed">
              {report ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="prose prose-invert prose-slate max-w-none prose-headings:font-semibold prose-headings:text-slate-100 prose-p:text-slate-300 prose-p:text-[14px] prose-p:leading-6 prose-a:text-sky-400 hover:prose-a:text-sky-300 prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800/80 prose-li:text-slate-300 prose-li:text-[14px]"
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-slate-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h4 className="text-slate-200 text-sm font-medium mb-1">Awaiting Research Instruction</h4>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    Formulate a query on the left or select a preset to begin the agentic research cycle.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Configuration Modal */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-sky-400" /> Pipeline Configuration
                </h3>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="text-slate-400 hover:text-slate-200 text-xs"
                >
                  Close
                </button>
              </div>

              {config && (
                <div className="space-y-4 text-xs font-sans">
                  <div>
                    <span className="text-slate-400 block mb-1">Serper API Key:</span>
                    <span className="font-mono text-slate-300 bg-slate-900 px-2 py-1 rounded block border border-slate-800">
                      {config.has_serper ? 'Configured & Active' : 'Missing'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Groq Engine Model:</span>
                    <span className="font-mono text-slate-300 bg-slate-900 px-2 py-1 rounded block border border-slate-800">
                      {config.research_agent_llm}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Multi-Agent Pipeline Architecture:</span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                      <li>Agent 1: Research Specialist (Serper Search)</li>
                      <li>Agent 2: Data Analyst (Synthesis)</li>
                      <li>Agent 3: Content Writer (Report Generation)</li>
                    </ul>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
