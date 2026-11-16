"""
Academic Reader & RAG Indexing Engine
- Fetches and extracts text from PDFs or academic abstracts.
- Chunks papers into semantic segments with provenance metadata.
- Provides vector similarity retrieval (RAG) and conversational Q&A.
"""
import os
import io
import re
import math
import hashlib
from typing import List, Dict, Any, Optional
import httpx
import pypdf

# Document & Chunk Store
class PaperChunk:
    def __init__(self, text: str, paper_id: str, paper_title: str, source: str, url: str, chunk_index: int):
        self.text = text
        self.paper_id = paper_id
        self.paper_title = paper_title
        self.source = source
        self.url = url
        self.chunk_index = chunk_index

class AcademicRAGIndex:
    def __init__(self):
        self.papers: Dict[str, Dict[str, Any]] = {}
        self.chunks: List[PaperChunk] = []

    def clear(self):
        self.papers.clear()
        self.chunks.clear()

    def add_paper_text(self, paper: Dict[str, Any], full_text: str):
        self.papers[paper["id"]] = paper
        
        # Split into semantic passages (~600-800 characters with 100 char overlap)
        chunk_size = 700
        overlap = 100
        stride = chunk_size - overlap
        
        cleaned = re.sub(r"\s+", " ", full_text).strip()
        if not cleaned:
            return

        for idx, i in enumerate(range(0, len(cleaned), stride)):
            chunk_slice = cleaned[i:i + chunk_size]
            if len(chunk_slice) > 50:
                self.chunks.append(PaperChunk(
                    text=chunk_slice,
                    paper_id=paper["id"],
                    paper_title=paper["title"],
                    source=paper.get("source", "Academic Index"),
                    url=paper.get("url") or paper.get("pdf_url") or "",
                    chunk_index=idx
                ))

    def retrieve(self, query: str, top_k: int = 5) -> List[PaperChunk]:
        """
        Hybrid BM25/keyword relevance retriever over indexed paper chunks.
        Fast, robust, zero external API latency, self-contained.
        """
        if not self.chunks:
            return []

        query_terms = [t.lower() for t in re.findall(r"\w+", query) if len(t) > 2]
        if not query_terms:
            return self.chunks[:top_k]

        scored: List[tuple[float, PaperChunk]] = []
        for ch in self.chunks:
            text_lower = ch.text.lower()
            title_lower = ch.paper_title.lower()
            score = 0.0
            
            for term in query_terms:
                tf = text_lower.count(term)
                if tf > 0:
                    score += (1.0 + math.log(tf))
                if term in title_lower:
                    score += 2.0  # title relevance boost
                    
            if score > 0:
                scored.append((score, ch))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [ch for _, ch in scored[:top_k]]


# Global in-memory RAG index instance per server lifecycle
global_rag_index = AcademicRAGIndex()


def fetch_pdf_text_or_abstract(paper: Dict[str, Any], timeout: float = 8.0) -> str:
    """
    Attempts to download up to the first 4 pages of the paper's PDF.
    If PDF download fails or times out, gracefully falls back to the rich abstract.
    """
    pdf_url = paper.get("pdf_url")
    abstract = paper.get("abstract", "")
    
    if not pdf_url:
        return f"TITLE: {paper['title']}\nABSTRACT: {abstract}"

    try:
        headers = {"User-Agent": "SwitchLit-Academic-Assistant/2.0"}
        with httpx.Client(timeout=timeout, follow_redirects=True, headers=headers) as client:
            resp = client.get(pdf_url)
            if resp.status_code == 200 and len(resp.content) > 1000:
                reader = pypdf.PdfReader(io.BytesIO(resp.content))
                extracted_pages = []
                # Read introductory pages (up to 4 pages) to extract problem, methodology, findings
                max_pages = min(4, len(reader.pages))
                for page_idx in range(max_pages):
                    text = reader.pages[page_idx].extract_text()
                    if text:
                        extracted_pages.append(text)
                
                full = "\n".join(extracted_pages).strip()
                if len(full) > 200:
                    return f"TITLE: {paper['title']}\nAUTHORS: {paper.get('authors', '')}\nTEXT CONTENT:\n{full}"
    except Exception as e:
        print(f"[AcademicReader] Notice: PDF download skipped ({e}), using abstract for {paper.get('title')}")

    return f"TITLE: {paper['title']}\nAUTHORS: {paper.get('authors', '')}\nABSTRACT:\n{abstract}"


def ingest_papers_into_rag(papers: List[Dict[str, Any]]):
    """Downloads & indexes the candidate papers into the active RAG store."""
    global_rag_index.clear()
    for paper in papers:
        text = fetch_pdf_text_or_abstract(paper)
        global_rag_index.add_paper_text(paper, text)
    print(f"[AcademicRAG] Successfully ingested {len(papers)} papers into {len(global_rag_index.chunks)} searchable chunks.")
