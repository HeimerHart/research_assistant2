import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  BookOpen
} from 'lucide-react';

interface ConfigStatus {
  has_serper: boolean;
  has_groq: boolean;
  has_openai: boolean;
  research_agent_llm: string;
  analyst_agent_llm: string;
  writer_agent_llm: string;
}

export default function App() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [report, setReport] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Fetch API / Configuration status on load
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => console.error('Failed to load config', err));
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleStartResearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim() || loading) return;

    setLoading(true);
    setLogs([]);
    setReport(null);
    setActiveStep(1);

    try {
      const response = await fetch('/api/research/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
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

                // Heuristic update for active agent based on CrewAI logs
                if (text.includes('Research Specialist') || text.includes('SerperDevTool')) {
                  setActiveStep(1);
                } else if (text.includes('Data Analyst') || text.includes('analyz')) {
                  setActiveStep(2);
                } else if (text.includes('Content Writer') || text.includes('writing')) {
                  setActiveStep(3);
                }
              } else if (data.type === 'complete') {
                setReport(data.content);
                setActiveStep(4);
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
    link.download = `${topic.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_research.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-semibold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                ResearchAI Pro
              </h1>
              <p className="text-xs text-slate-400">Autonomous Multi-Agent Intelligence</p>
            </div>
          </div>

          {/* Config / Keys indicator badges */}
          <div className="flex items-center gap-2">
            {config && (
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                    config.has_serper
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      config.has_serper ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  Serper Search: {config.has_serper ? 'Ready' : 'Not configured'}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                    config.has_groq
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  Groq LLM: {config.has_groq ? 'Active' : 'Unset'}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input + Multi-Agent Workflow Tracker */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Query Box */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl backdrop-blur-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-400" /> Topic of Research
            </h2>
            <form onSubmit={handleStartResearch} className="flex flex-col gap-3">
              <div className="relative">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Next-Gen Solid State Batteries in 2026..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all text-white"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !topic.trim()}
                className="w-full py-3 px-4 rounded-xl font-medium text-sm bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin text-white" />
                    Autonomous Agents Working...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Kickoff Research Crew
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Agents Pipeline Status */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl backdrop-blur-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-400" /> Crew Workflow
              </h2>
              <span className="text-xs text-slate-500 font-mono">Sequential Process</span>
            </div>

            <div className="space-y-3">
              {/* Agent 1 */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  activeStep === 1
                    ? 'bg-indigo-500/10 border-indigo-500/40 shadow-sm shadow-indigo-500/10'
                    : activeStep > 1
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-300'
                    : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        activeStep === 1
                          ? 'bg-indigo-500 text-white animate-pulse'
                          : activeStep > 1
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Search className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-slate-200">Research Specialist</h4>
                      <p className="text-xs text-slate-400">Scrapes & gathers Google/Serper data</p>
                    </div>
                  </div>
                  {activeStep > 1 && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
              </div>

              {/* Agent 2 */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  activeStep === 2
                    ? 'bg-indigo-500/10 border-indigo-500/40 shadow-sm shadow-indigo-500/10'
                    : activeStep > 2
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-300'
                    : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        activeStep === 2
                          ? 'bg-indigo-500 text-white animate-pulse'
                          : activeStep > 2
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-slate-200">Data Analyst</h4>
                      <p className="text-xs text-slate-400">Synthesizes, cross-verifies & extracts insights</p>
                    </div>
                  </div>
                  {activeStep > 2 && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
              </div>

              {/* Agent 3 */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  activeStep === 3
                    ? 'bg-indigo-500/10 border-indigo-500/40 shadow-sm shadow-indigo-500/10'
                    : activeStep > 3
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-300'
                    : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        activeStep === 3
                          ? 'bg-indigo-500 text-white animate-pulse'
                          : activeStep > 3
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-slate-200">Content Writer</h4>
                      <p className="text-xs text-slate-400">Compiles cohesive final publication report</p>
                    </div>
                  </div>
                  {activeStep > 3 && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Agent Log Stream */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex-1 flex flex-col min-h-[220px] max-h-[340px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-2">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" /> Live Agent Execution Logs
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase">
                {loading ? 'Streaming...' : 'Idle'}
              </span>
            </div>
            <div
              ref={logContainerRef}
              className="font-mono text-xs text-slate-400 overflow-y-auto space-y-1.5 flex-1 pr-2 scrollbar-thin scrollbar-thumb-slate-800"
            >
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-600 italic">
                  Agent reasoning and tool outputs will appear here...
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

        {/* Right Column: Research Report Preview */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="h-full min-h-[600px] rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl flex flex-col overflow-hidden backdrop-blur-sm">
            {/* Report Header */}
            <div className="p-5 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <h3 className="font-medium text-slate-200">Synthesized Findings</h3>
              </div>

              {report && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs flex items-center gap-1.5"
                    title="Copy Markdown"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={downloadReport}
                    className="p-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors text-xs flex items-center gap-1.5"
                    title="Download Report (.md)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              )}
            </div>

            {/* Report Content Display */}
            <div className="flex-1 p-8 overflow-y-auto">
              {report ? (
                <div className="prose prose-invert prose-indigo max-w-none prose-headings:font-semibold prose-a:text-indigo-400 prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-center mb-4 text-slate-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h4 className="text-slate-300 font-medium mb-1">No Research Conducted Yet</h4>
                  <p className="text-sm max-w-sm text-slate-500">
                    Enter any scientific, business, or market analysis topic on the left to activate the AI agent crew.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
