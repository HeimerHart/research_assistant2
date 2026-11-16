"""
FastAPI Backend for Switch-Lit Academic Research Assistant & RAG Engine
Exposes:
- GET /api/config: Configuration status
- POST /api/academic/discover: Search arXiv, Zenodo, OpenAlex for candidate papers (with disk caching)
- POST /api/research/stream: Multi-agent synthesis pipeline with SSE streaming
- POST /api/papers/chat: Live RAG chat answering follow-up questions from the indexed papers
"""
import os
import sys
import json
import asyncio
import io
from typing import AsyncGenerator, List, Optional
from contextlib import redirect_stdout, redirect_stderr
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

# Load environment configuration
load_dotenv(override=True)

# Workaround for CrewAI + Groq: strip unsupported 'cache_breakpoint' property from messages
try:
    import litellm

    def _strip_cache_breakpoint(messages):
        if isinstance(messages, list):
            for m in messages:
                if isinstance(m, dict):
                    m.pop("cache_breakpoint", None)

    _orig_completion = litellm.completion
    def _patched_completion(*args, **kwargs):
        if "messages" in kwargs:
            _strip_cache_breakpoint(kwargs["messages"])
        return _orig_completion(*args, **kwargs)
    litellm.completion = _patched_completion

    if hasattr(litellm, "acompletion"):
        _orig_acompletion = litellm.acompletion
        async def _patched_acompletion(*args, **kwargs):
            if "messages" in kwargs:
                _strip_cache_breakpoint(kwargs["messages"])
            return await _orig_acompletion(*args, **kwargs)
        litellm.acompletion = _patched_acompletion

except Exception as _patch_err:
    print(f"[Warning] Failed to patch litellm for cache_breakpoint: {_patch_err}")

# Also patch crewai cache breakpoint if available
try:
    import crewai.llms.cache as _crewai_cache
    _crewai_cache.mark_cache_breakpoint = lambda msg: msg
except Exception:
    pass

from academic_rag.academic_discovery import discover_academic_papers
from academic_rag.rag_engine import ingest_papers_into_rag, global_rag_index

app = FastAPI(
    title="Switch-Lit Academic Assistant & RAG API",
    description="Backend API powering Academic Discovery, Multi-Agent Synthesis, and Paper RAG",
    version="2.0.0"
)

# Enable CORS for Vite frontend (http://localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DiscoverRequest(BaseModel):
    topic: str
    limit: Optional[int] = 5

class ResearchRequest(BaseModel):
    topic: str
    papers: Optional[List[dict]] = None

class PaperChatRequest(BaseModel):
    question: str
    topic: Optional[str] = None

class ConfigStatus(BaseModel):
    has_serper: bool
    has_groq: bool
    has_openai: bool
    research_agent_llm: str
    analyst_agent_llm: str
    writer_agent_llm: str


@app.get("/api/config", response_model=ConfigStatus)
def get_config_status():
    """Returns the API keys and LLM configuration status."""
    load_dotenv(override=True)
    return ConfigStatus(
        has_serper=bool(os.getenv("SERPER_API_KEY")),
        has_groq=bool(os.getenv("GROQ_API_KEY")),
        has_openai=bool(os.getenv("OPENAI_API_KEY")),
        research_agent_llm=os.getenv("RESEARCH_AGENT_LLM", "groq/qwen/qwen3.8-27b"),
        analyst_agent_llm=os.getenv("ANALYST_AGENT_LLM", "groq/qwen/qwen3.8-27b"),
        writer_agent_llm=os.getenv("WRITER_AGENT_LLM", "groq/qwen/qwen3.8-27b")
    )


@app.post("/api/academic/discover")
def discover_papers_endpoint(req: DiscoverRequest):
    """
    Finds relevant academic research papers across arXiv, Zenodo, and OpenAlex.
    Includes caching so repetitive queries return instantaneously.
    """
    if not req.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty.")
    
    papers = discover_academic_papers(req.topic.strip(), limit=req.limit or 5)
    return {"topic": req.topic, "count": len(papers), "papers": papers}


class StreamCapture(io.StringIO):
    """Captures stdout and queues logs for real-time SSE streaming"""
    def __init__(self, queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
        super().__init__()
        self.queue = queue
        self.loop = loop

    def write(self, s: str):
        if s:
            self.loop.call_soon_threadsafe(self.queue.put_nowait, s)
        return super().write(s)


async def execute_crew_research(topic: str, papers: Optional[List[dict]], queue: asyncio.Queue) -> None:
    """Runs Academic Ingestion & Synthesis while capturing output logs."""
    loop = asyncio.get_running_loop()
    
    def run_crew():
        try:
            capture = StreamCapture(queue, loop)
            with redirect_stdout(capture), redirect_stderr(capture):
                print(f"[Academic Desk] Initiating deep literature review for: '{topic}'...")
                
                # 1. Discover or reuse candidate papers
                target_papers = papers
                if not target_papers:
                    print(f"[Academic Desk] Querying arXiv, Zenodo, and OpenAlex for relevant literature...")
                    target_papers = discover_academic_papers(topic, limit=5)
                
                print(f"[Academic Desk] Found {len(target_papers)} primary research publications.")
                
                # 2. Ingest papers into RAG index
                print(f"[Academic Desk] Reading paper full text / abstracts into RAG vector space...")
                ingest_papers_into_rag(target_papers)
                print(f"[Academic Desk] Indexed {len(global_rag_index.chunks)} knowledge chunks.")

                # 3. Format grounded research brief directly for CrewAI orchestration
                import crew
                
                # Inject retrieved papers as direct grounding context
                academic_context_str = "\n\n".join([
                    f"[{i+1}] Title: {p['title']}\n"
                    f"Authors: {p.get('authors', 'Unknown')}\n"
                    f"Source/Venue: {p.get('venue', p.get('source', 'Academic'))}\n"
                    f"Year: {p.get('published', 'Recent')}\n"
                    f"URL: {p.get('url', p.get('pdf_url', ''))}\n"
                    f"DOI: {p.get('doi', 'N/A')}\n"
                    f"Abstract/Summary: {p.get('abstract', '')[:600]}"
                    for i, p in enumerate(target_papers)
                ])

                enriched_topic = f"{topic}\n\nPRIMARY ACADEMIC LITERATURE RETRIEVED:\n{academic_context_str}"
                
                print(f"[Agent Orchestration] Agents activating: Research Specialist -> Data Analyst -> Content Writer...")
                result = crew.research_crew.kickoff({"topic": enriched_topic})
                
                # Append academic references if not explicitly generated
                report_str = str(result)
                if "### Academic Sources & Literature" not in report_str and "## References" not in report_str:
                    refs_block = "\n\n### Primary Academic Sources\n"
                    for idx, p in enumerate(target_papers):
                        pdf_link = f" ([Direct PDF]({p['pdf_url']}))" if p.get('pdf_url') else ""
                        refs_block += f"- **[{idx+1}]** [{p['title']}]({p.get('url', '#')}){pdf_link} - *{p.get('authors', '')}* ({p.get('source', '')}, {p.get('published', '')})\n"
                    report_str += refs_block

                return report_str

        except Exception as e:
            import traceback
            traceback.print_exc()
            return f"__ERROR__: {str(e)}"

    result = await asyncio.to_thread(run_crew)
    await queue.put({"final_result": result})


@app.post("/api/research/stream")
async def stream_research(req: ResearchRequest):
    """Streams live log updates of academic agents and yields final research findings."""
    if not req.topic.strip():
        raise HTTPException(status_code=400, detail="Research topic cannot be empty.")

    queue = asyncio.Queue()
    worker = asyncio.create_task(execute_crew_research(req.topic, req.papers, queue))

    async def event_generator() -> AsyncGenerator[str, None]:
        while True:
            try:
                item = await asyncio.wait_for(queue.get(), timeout=0.5)
                if isinstance(item, dict) and "final_result" in item:
                    payload = json.dumps({"type": "complete", "content": item["final_result"]})
                    yield f"data: {payload}\n\n"
                    break
                else:
                    payload = json.dumps({"type": "log", "content": str(item)})
                    yield f"data: {payload}\n\n"
            except asyncio.TimeoutError:
                if worker.done():
                    break
                yield ": keepalive\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.post("/api/papers/chat")
async def chat_with_papers_endpoint(req: PaperChatRequest):
    """
    RAG endpoint that queries the retrieved academic papers and generates
    grounded, citation-backed answers to user follow-up questions.
    """
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    # 1. Retrieve top relevant chunks from RAG index
    retrieved_chunks = global_rag_index.retrieve(req.question, top_k=4)
    
    if not retrieved_chunks:
        # Fallback if no papers were indexed yet in memory
        return {
            "answer": "No academic papers have been indexed in the active workspace yet. Please run an inquiry above or select candidate papers first.",
            "citations": []
        }

    # 2. Build grounded context
    context_text = "\n\n".join([
        f"[Source: {ch.paper_title} ({ch.source})]\nExcerpt: {ch.text}"
        for ch in retrieved_chunks
    ])

    citations = [
        {"title": ch.paper_title, "source": ch.source, "url": ch.url}
        for ch in retrieved_chunks
    ]

    # 3. Query LLM via litellm
    import litellm
    groq_model = os.getenv("RESEARCH_AGENT_LLM", "groq/qwen/qwen3.8-27b")
    
    system_prompt = (
        "You are an expert Academic Research Advisor on Switch-Lit. "
        "Answer the user's question accurately and strictly based on the provided academic paper excerpts. "
        "Cite the paper titles inline. Provide helpful tips, methodological comparisons, or explanations as asked."
    )
    user_prompt = f"PAPER EXCERPTS:\n{context_text}\n\nQUESTION: {req.question}\n\nANSWER:"

    try:
        response = litellm.completion(
            model=groq_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2
        )
        answer = response.choices[0].message.content
    except Exception as e:
        answer = f"Error querying academic advisor: {str(e)}"

    return {
        "answer": answer,
        "citations": citations[:3]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
