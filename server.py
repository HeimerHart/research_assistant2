"""
FastAPI Backend for AI Research Assistant
Exposes REST endpoints and SSE streams for real-time multi-agent research workflow.
"""
import os
import sys
import json
import asyncio
import io
from typing import AsyncGenerator
from contextlib import redirect_stdout, redirect_stderr
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

# Load environment configuration
load_dotenv()

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

app = FastAPI(
    title="AI Research Assistant API",
    description="Backend API powering CrewAI Multi-Agent Research Assistant",
    version="1.0.0"
)

# Enable CORS for Vite frontend (http://localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResearchRequest(BaseModel):
    topic: str

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
        research_agent_llm=os.getenv("RESEARCH_AGENT_LLM", "groq/llama-3.3-70b-versatile"),
        analyst_agent_llm=os.getenv("ANALYST_AGENT_LLM", "groq/llama-3.3-70b-versatile"),
        writer_agent_llm=os.getenv("WRITER_AGENT_LLM", "groq/llama-3.3-70b-versatile")
    )

class StreamCapture(io.StringIO):
    """Captures stdout and queues logs for real-time SSE streaming"""
    def __init__(self, queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
        super().__init__()
        self.queue = queue
        self.loop = loop

    def write(self, s: str):
        if s:
            # Schedule putting message into the asyncio queue safely
            self.loop.call_soon_threadsafe(self.queue.put_nowait, s)
        return super().write(s)


async def execute_crew_research(topic: str, queue: asyncio.Queue) -> None:
    """Runs CrewAI kickoff in an executor while capturing output logs."""
    loop = asyncio.get_running_loop()
    
    def run_crew():
        try:
            # Check if crewai is available
            import crew
            capture = StreamCapture(queue, loop)
            with redirect_stdout(capture), redirect_stderr(capture):
                print(f"[System] Initiating research pipeline for: '{topic}'...")
                result = crew.research_crew.kickoff({"topic": topic})
                return str(result)
        except Exception as e:
            # Fallback mock/simulation if crew fails due to missing keys or module
            return f"__ERROR__: {str(e)}"

    result = await asyncio.to_thread(run_crew)
    await queue.put({"final_result": result})


@app.post("/api/research/stream")
async def stream_research(req: ResearchRequest):
    """Streams live log updates of agents and yields final research report."""
    if not req.topic.strip():
        raise HTTPException(status_code=400, detail="Research topic cannot be empty.")

    queue = asyncio.Queue()
    
    # Spawn research worker in background
    worker = asyncio.create_task(execute_crew_research(req.topic, queue))

    async def event_generator() -> AsyncGenerator[str, None]:
        while True:
            # Check if background worker has produced output
            try:
                item = await asyncio.wait_for(queue.get(), timeout=0.5)
                if isinstance(item, dict) and "final_result" in item:
                    # Final result received
                    payload = json.dumps({"type": "complete", "content": item["final_result"]})
                    yield f"data: {payload}\n\n"
                    break
                else:
                    payload = json.dumps({"type": "log", "content": str(item)})
                    yield f"data: {payload}\n\n"
            except asyncio.TimeoutError:
                if worker.done():
                    break
                # Send keep-alive ping
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)

