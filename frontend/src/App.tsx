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
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  Star
} from 'lucide-react';

interface AcademicPaper {
  id: string;
  title: string;
  authors: string;
  abstract: string;
  published: string;
  source: string;
  venue?: string;
  category?: string;
  citations?: number;
  downloads_estimate?: number;
  rating_score?: number;
  rating_badge?: string;
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
    id: 'openalex_W2741809807',
    title: 'Attention Is All You Need',
    authors: 'Ashish Vaswani, Noam Shazeer, Niki Parmar et al.',
    abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks in an encoder-decoder configuration. We introduce the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output.',
    published: '2017',
    source: 'arXiv / NeurIPS',
    venue: 'NeurIPS',
    category: 'COMPUTING & AI',
    citations: 136431,
    downloads_estimate: 1845000,
    rating_score: 4.98,
    rating_badge: '★ 136.4k Citations • Top 0.01% Impact',
    pdf_url: 'https://arxiv.org/pdf/1706.03762',
    url: 'https://arxiv.org/abs/1706.03762',
  },
  {
    id: 'openalex_W2964344401',
    title: 'The Materials Project: A materials genome approach to accelerating materials innovation',
    authors: 'Anubhav Jain, Shyue Ping Ong, Geoffroy Hautier et al.',
    abstract: 'Accelerating the discovery and synthesis of advanced energy storage materials through high-throughput ab initio computing and accessible materials databases for solid-state battery electrolytes.',
    published: '2013',
    source: 'APL Materials',
    venue: 'APL Materials',
    category: 'ENERGY STORAGE',
    citations: 13882,
    downloads_estimate: 192000,
    rating_score: 4.91,
    rating_badge: '★ 13.9k Citations • Landmark Work',
    pdf_url: 'https://pubs.aip.org/aip/apm/article-pdf/doi/10.1063/1.4812323/13180479/011002_1_online.pdf',
    url: 'https://doi.org/10.1063/1.4812323',
  },
  {
    id: 'openalex_W3123847291',
    title: 'GPT-4 Technical Report',
    authors: 'OpenAI, Josh Achiam, Steven Adler et al.',
    abstract: 'We report the development of GPT-4, a large-scale, multimodal model which can accept image and text inputs and produce text outputs, demonstrating human-level performance across diverse academic and professional benchmarks.',
    published: '2023',
    source: 'arXiv',
    venue: 'OpenAI Preprints',
    category: 'AUTONOMOUS SYSTEMS',
    citations: 38402,
    downloads_estimate: 620000,
    rating_score: 4.95,
    rating_badge: '★ 38.4k Citations • Frontier AI',
    pdf_url: 'https://arxiv.org/pdf/2303.08774',
    url: 'https://arxiv.org/abs/2303.08774',
  },
  {
    id: 'openalex_W2971275997',
    title: 'nuScenes: A Multimodal Dataset for Autonomous Driving',
    authors: 'Holger Caesar, Varun Bankiti, Alex H. Lang et al.',
    abstract: 'We present nuScenes, the first public large-scale dataset for autonomous driving navigation with the full sensor suite (6 cameras, 1 lidar, 5 radars, GPS, IMU) and 360-degree coverage.',
    published: '2020',
    source: 'CVPR',
    venue: 'IEEE / CVF CVPR',
    category: 'ROBOTICS & SPACE',
    citations: 7978,
    downloads_estimate: 145000,
    rating_score: 4.88,
    rating_badge: '★ 7.9k Citations • Benchmark Standard',
    pdf_url: 'https://openaccess.thecvf.com/content_CVPR_2020/papers/Caesar_nuScenes_A_Multimodal_Dataset_for_Autonomous_Driving_CVPR_2020_paper.pdf',
    url: 'https://arxiv.org/abs/1903.11027',
  }
];

const CARD_STYLES = [
  { gradient: 'from-[#a5c4ec] via-[#cde2f8] to-[#9ebde8]', category: 'COMPUTING & AI' },
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

  // Featured Literature Deck (Most Famous & Highly Cited Papers across Sciences)
  const [featuredLiterature, setFeaturedLiterature] = useState<AcademicPaper[]>(() => {
    try {
      const saved = localStorage.getItem('switchlit_featured_papers');
      return saved ? JSON.parse(saved) : DEFAULT_FEATURED;
    } catch {
      return DEFAULT_FEATURED;
    }
  });
  const [featuredPage, setFeaturedPage] = useState<number>(0);
  const [refreshingDeck, setRefreshingDeck] = useState<boolean>(false);
  const [nextRefreshCountdown, setNextRefreshCountdown] = useState<string>('');

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

  const updateCountdownDisplay = (expiresAtMs: number) => {
    const diff = expiresAtMs - Date.now();
    if (diff <= 0) {
      setNextRefreshCountdown('due now');
      return;
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    setNextRefreshCountdown(`${hours}h ${mins}m`);
  };

  const fetchFeaturedLiterature = async (force: boolean = false) => {
    setRefreshingDeck(true);
    try {
      const res = await fetch(`/api/academic/featured?force=${force}`);
      if (res.ok) {
        const data = await res.json();
        if (data.papers && data.papers.length > 0) {
          setFeaturedLiterature(data.papers);
          const now = Date.now();
          const ttlMs = (data.expires_in_seconds || 21600) * 1000;
          const expiresAt = now + ttlMs;
          localStorage.setItem('switchlit_featured_papers', JSON.stringify(data.papers));
          localStorage.setItem('switchlit_featured_expires_at', String(expiresAt));
          updateCountdownDisplay(expiresAt);
        }
      }
    } catch (e) {
      console.error('Error fetching featured literature', e);
    } finally {
      setRefreshingDeck(false);
    }
  };

  // Automatic 6-Hour Refresh Cycle
  useEffect(() => {
    const savedExpires = localStorage.getItem('switchlit_featured_expires_at');
    const now = Date.now();

    if (!savedExpires || now >= Number(savedExpires)) {
      fetchFeaturedLiterature(false);
    } else {
      updateCountdownDisplay(Number(savedExpires));
    }

    // Interval to refresh countdown display and trigger fetch if 6 hours elapsed
    const timer = setInterval(() => {
      const exp = Number(localStorage.getItem('switchlit_featured_expires_at')) || 0;
      if (Date.now() >= exp) {
        fetchFeaturedLiterature(false);
      } else {
        updateCountdownDisplay(exp);
      }
    }, 60000);

    return () => clearInterval(timer);
  }, []);

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
          {discovering && (
            <p className="text-[11px] font-mono text-emerald-800 mt-2.5 flex items-center justify-center gap-1.5 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" /> Retrieving open-access preprints across arXiv, Zenodo & OpenAlex...
            </p>
          )}
        </div>
      </section>

      {/* Featured Research Papers Section (Direct visual match with user image) */}
      <section className="max-w-6xl mx-auto px-8 w-full mt-4 mb-8">
        <div className="flex flex-wrap items-center justify-between pb-3 mb-4 border-b border-[#111110] gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-black">
              Featured Inquiries & Research Literature
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#666660] bg-[#f2f2ed] border border-[#dcdcd4] px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3 text-[#555550]" />
              <span>6H AUTO-REFRESH</span>
              {nextRefreshCountdown && (
                <span className="text-[#888880]">({nextRefreshCountdown})</span>
              )}
            </div>
            {refreshingDeck && (
              <span className="text-[11px] font-mono text-emerald-800 flex items-center gap-1 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" /> Fetching top-cited papers...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* 6h Manual Refresh Button */}
            <button
              onClick={() => fetchFeaturedLiterature(true)}
              disabled={refreshingDeck}
              className="text-[11px] font-mono text-[#555550] hover:text-black px-2.5 py-1 border border-[#d8d8d2] rounded hover:bg-[#f0f0eb] transition-all flex items-center gap-1.5 disabled:opacity-50"
              title="Query OpenAlex & arXiv for live top papers and restart 6h cycle"
            >
              <RefreshCw className={`w-3 h-3 ${refreshingDeck ? 'animate-spin text-black' : ''}`} />
              <span>{refreshingDeck ? 'Refreshing...' : 'Refresh Deck'}</span>
            </button>

            {/* Pagination Navigation Arrows (Direct match with reference image) */}
            <div className="flex items-center gap-1 border border-[#d8d8d2] rounded p-0.5 bg-white">
              <button
                onClick={() => {
                  const maxPages = Math.ceil(featuredLiterature.length / 4) || 1;
                  setFeaturedPage((prev) => (prev > 0 ? prev - 1 : maxPages - 1));
                }}
                className="p-1 hover:bg-[#efefe9] rounded text-black transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono px-1.5 text-[#666660]">
                {featuredPage + 1}/{Math.ceil(featuredLiterature.length / 4) || 1}
              </span>
              <button
                onClick={() => {
                  const maxPages = Math.ceil(featuredLiterature.length / 4) || 1;
                  setFeaturedPage((prev) => (prev + 1 < maxPages ? prev + 1 : 0));
                }}
                className="p-1 hover:bg-[#efefe9] rounded text-black transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {featuredLiterature.slice(featuredPage * 4, (featuredPage + 1) * 4).map((paper, idx) => {
            const style = CARD_STYLES[idx % CARD_STYLES.length];
            const categoryLabel = paper.category || style.category;
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
                  
                  {/* Top Badges: Category & Year */}
                  <div className="flex items-center justify-between z-10 w-full gap-1">
                    <span className="text-[9.5px] font-mono uppercase tracking-widest text-black/85 bg-white/70 px-2 py-0.5 rounded backdrop-blur-sm truncate max-w-[130px]">
                      {categoryLabel}
                    </span>
                    <span className="text-[9px] font-mono text-black/75 bg-white/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                      {paper.published}
                    </span>
                  </div>

                  {/* Prominent Citations & Downloads Metric Pill */}
                  {paper.citations ? (
                    <div className="z-10 bg-black/85 text-white backdrop-blur-sm px-2.5 py-1.5 rounded-lg text-[10px] font-mono self-start flex items-center gap-1.5 shadow-sm">
                      <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                      <span className="font-semibold">{paper.citations.toLocaleString()}</span>
                      <span className="text-white/70 text-[9px]">citations</span>
                    </div>
                  ) : null}

                  {/* Bookmark Button */}
                  <div className="w-8 h-8 rounded-full bg-white/80 border border-black/20 flex items-center justify-center text-black/70 self-end group-hover:bg-white transition-colors z-10">
                    <Bookmark className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Caption & Metadata */}
                <div className="mt-2.5">
                  <h4 className="text-[13px] font-semibold text-black tracking-tight group-hover:underline line-clamp-1" title={paper.title}>
                    {paper.title}
                  </h4>
                  <p className="text-[10.5px] font-mono text-[#666660] uppercase mt-0.5 truncate">
                    written by {paper.authors}
                  </p>
                  <div className="flex items-center justify-between text-[9.5px] font-mono text-[#888880] mt-1">
                    <span className="truncate max-w-[140px]">{paper.source || paper.venue || 'Academic Index'}</span>
                    {paper.rating_badge && (
                      <span className="text-emerald-800 font-semibold truncate ml-1">{paper.rating_badge.split('•')[0]}</span>
                    )}
                  </div>
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
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-mono font-bold bg-[#d8f3dc] text-[#1b4332] px-2 py-0.5 rounded-full uppercase">
                      {selectedPaperForModal.source || 'Open Access'}
                    </span>
                    {selectedPaperForModal.category && (
                      <span className="text-[10px] font-mono font-medium bg-[#f0f0eb] text-[#333330] px-2 py-0.5 rounded-full uppercase">
                        {selectedPaperForModal.category}
                      </span>
                    )}
                    {selectedPaperForModal.citations !== undefined && (
                      <span className="text-[10px] font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-600 text-amber-600" />
                        {selectedPaperForModal.citations.toLocaleString()} Citations
                      </span>
                    )}
                    {selectedPaperForModal.rating_badge && (
                      <span className="text-[10px] font-mono bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full font-medium">
                        {selectedPaperForModal.rating_badge.split('•')[0]}
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif text-2xl text-black mt-1 leading-tight">
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
