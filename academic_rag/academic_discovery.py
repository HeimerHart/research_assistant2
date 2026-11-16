"""
Academic Discovery Module
Fetches real academic research papers from arXiv, Zenodo, and OpenAlex.
Includes an in-memory & file-based disk cache for lightning-fast retrieval.
"""
import os
import re
import json
import hashlib
import urllib.parse
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional
import httpx

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".academic_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

def _get_cache_key(prefix: str, query: str) -> str:
    cleaned = query.strip().lower()
    hashed = hashlib.md5(cleaned.encode("utf-8")).hexdigest()
    return os.path.join(CACHE_DIR, f"{prefix}_{hashed}.json")

def _read_cache(prefix: str, query: str) -> Optional[List[Dict[str, Any]]]:
    cache_file = _get_cache_key(prefix, query)
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None
    return None

def _write_cache(prefix: str, query: str, data: List[Dict[str, Any]]):
    cache_file = _get_cache_key(prefix, query)
    try:
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[AcademicDiscovery] Cache write error: {e}")


def search_arxiv(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """Searches arXiv via its official Atom/XML API."""
    cached = _read_cache("arxiv", query)
    if cached is not None:
        return cached

    papers = []
    try:
        encoded_query = urllib.parse.quote(query)
        url = f"https://export.arxiv.org/api/query?search_query=all:{encoded_query}&start=0&max_results={max_results}&sortBy=relevance&sortOrder=descending"
        
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            resp = client.get(url)
            if resp.status_code == 200:
                root = ET.fromstring(resp.text)
                atom_ns = {"atom": "http://www.w3.org/2005/Atom"}
                
                for entry in root.findall("atom:entry", atom_ns):
                    title_elem = entry.find("atom:title", atom_ns)
                    title = title_elem.text.strip().replace("\n", " ") if title_elem is not None else "Untitled Paper"
                    
                    summary_elem = entry.find("atom:summary", atom_ns)
                    abstract = summary_elem.text.strip().replace("\n", " ") if summary_elem is not None else ""
                    
                    published_elem = entry.find("atom:published", atom_ns)
                    published = published_elem.text[:10] if published_elem is not None else ""
                    
                    authors = []
                    for author in entry.findall("atom:author", atom_ns):
                        name = author.find("atom:name", atom_ns)
                        if name is not None and name.text:
                            authors.append(name.text.strip())
                    
                    paper_id = ""
                    pdf_url = ""
                    abs_url = ""
                    
                    for link in entry.findall("atom:link", atom_ns):
                        href = link.attrib.get("href", "")
                        rel = link.attrib.get("rel", "")
                        title_attr = link.attrib.get("title", "")
                        
                        if title_attr == "pdf" or "pdf" in href:
                            pdf_url = href
                        elif rel == "alternate":
                            abs_url = href
                    
                    id_elem = entry.find("atom:id", atom_ns)
                    if id_elem is not None and id_elem.text:
                        raw_id = id_elem.text.strip()
                        # e.g., http://arxiv.org/abs/2403.12345v1
                        match = re.search(r"(\d{4}\.\d{4,5}(?:v\d+)?)", raw_id)
                        if match:
                            paper_id = match.group(1)
                            if not pdf_url:
                                pdf_url = f"https://arxiv.org/pdf/{paper_id}.pdf"
                            if not abs_url:
                                abs_url = f"https://arxiv.org/abs/{paper_id}"

                    papers.append({
                        "id": f"arxiv_{paper_id}" if paper_id else f"arxiv_{hashlib.md5(title.encode()).hexdigest()[:8]}",
                        "title": title,
                        "authors": ", ".join(authors[:4]) + (" et al." if len(authors) > 4 else ""),
                        "abstract": abstract,
                        "published": published,
                        "source": "arXiv",
                        "venue": "arXiv preprint",
                        "pdf_url": pdf_url,
                        "url": abs_url or pdf_url,
                        "doi": f"10.48550/arXiv.{paper_id}" if paper_id else None
                    })
    except Exception as e:
        print(f"[AcademicDiscovery] arXiv fetch error: {e}")

    _write_cache("arxiv", query, papers)
    return papers


def search_zenodo(query: str, max_results: int = 4) -> List[Dict[str, Any]]:
    """Searches Zenodo Open Access REST API."""
    cached = _read_cache("zenodo", query)
    if cached is not None:
        return cached

    papers = []
    try:
        url = "https://zenodo.org/api/records"
        params = {
            "q": query,
            "size": max_results,
            "sort": "bestmatch",
            "type": "publication"
        }
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                for hit in data.get("hits", {}).get("hits", []):
                    metadata = hit.get("metadata", {})
                    title = metadata.get("title", "Untitled Research")
                    description = re.sub(r"<[^>]+>", "", metadata.get("description", ""))
                    published = metadata.get("publication_date", "")
                    creators = [c.get("name", "") for c in metadata.get("creators", []) if "name" in c]
                    doi = hit.get("doi", metadata.get("doi", ""))
                    
                    links = hit.get("links", {})
                    record_url = links.get("html", f"https://zenodo.org/record/{hit.get('id')}")
                    
                    # Check for direct pdf in files
                    files = hit.get("files", [])
                    pdf_url = ""
                    for f in files:
                        if f.get("key", "").endswith(".pdf") or f.get("type") == "pdf":
                            pdf_url = f.get("links", {}).get("self", "")
                            break
                    
                    papers.append({
                        "id": f"zenodo_{hit.get('id')}",
                        "title": title,
                        "authors": ", ".join(creators[:3]) + (" et al." if len(creators) > 3 else ""),
                        "abstract": description[:800],
                        "published": published,
                        "source": "Zenodo",
                        "venue": metadata.get("journal_title", "Zenodo Open Access"),
                        "pdf_url": pdf_url or record_url,
                        "url": record_url,
                        "doi": doi
                    })
    except Exception as e:
        print(f"[AcademicDiscovery] Zenodo fetch error: {e}")

    _write_cache("zenodo", query, papers)
    return papers


def search_openalex(query: str, max_results: int = 4) -> List[Dict[str, Any]]:
    """Searches OpenAlex API for conference papers, citations, and journals."""
    cached = _read_cache("openalex", query)
    if cached is not None:
        return cached

    papers = []
    try:
        url = "https://api.openalex.org/works"
        params = {
            "search": query,
            "per-page": max_results,
            "filter": "has_abstract:true"
        }
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                for work in data.get("results", []):
                    title = work.get("title") or "Untitled Work"
                    
                    # OpenAlex stores abstract as inverted index
                    abstract_index = work.get("abstract_inverted_index")
                    abstract = ""
                    if abstract_index:
                        word_pos = []
                        for word, positions in abstract_index.items():
                            for pos in positions:
                                word_pos.append((pos, word))
                        word_pos.sort(key=lambda x: x[0])
                        abstract = " ".join([w for _, w in word_pos])[:800]
                    
                    authorships = work.get("authorships", [])
                    authors = [a.get("author", {}).get("display_name", "") for a in authorships if a.get("author")]
                    
                    published = str(work.get("publication_year", ""))
                    
                    # Primary location & open access pdf
                    primary_loc = work.get("primary_location") or {}
                    source_name = primary_loc.get("source", {}).get("display_name") if primary_loc.get("source") else "Conference / Journal"
                    pdf_url = (work.get("open_access") or {}).get("oa_url") or primary_loc.get("pdf_url") or ""
                    work_url = primary_loc.get("landing_page_url") or work.get("doi") or f"https://openalex.org/{work.get('id')}"
                    
                    papers.append({
                        "id": f"openalex_{work.get('id', '').split('/')[-1]}",
                        "title": title,
                        "authors": ", ".join(authors[:3]) + (" et al." if len(authors) > 3 else ""),
                        "abstract": abstract,
                        "published": published,
                        "source": "OpenAlex",
                        "venue": source_name,
                        "pdf_url": pdf_url or work_url,
                        "url": work_url,
                        "doi": work.get("doi")
                    })
    except Exception as e:
        print(f"[AcademicDiscovery] OpenAlex fetch error: {e}")

    _write_cache("openalex", query, papers)
    return papers


def discover_academic_papers(topic: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Combined academic discovery aggregator across arXiv, Zenodo, and OpenAlex.
    Deduplicates and returns top relevant papers.
    """
    cached = _read_cache("unified", topic)
    if cached is not None:
        return cached

    all_papers: List[Dict[str, Any]] = []
    
    # 1. Fetch arXiv
    arxiv_results = search_arxiv(topic, max_results=4)
    all_papers.extend(arxiv_results)
    
    # 2. Fetch OpenAlex
    openalex_results = search_openalex(topic, max_results=3)
    all_papers.extend(openalex_results)
    
    # 3. Fetch Zenodo
    zenodo_results = search_zenodo(topic, max_results=2)
    all_papers.extend(zenodo_results)

    # Deduplicate by normalized title
    seen_titles = set()
    deduped = []
    for p in all_papers:
        clean_title = re.sub(r"[^a-zA-Z0-9]", "", p["title"].lower())
        if clean_title and clean_title not in seen_titles:
            seen_titles.add(clean_title)
            deduped.append(p)
            if len(deduped) >= limit:
                break

    _write_cache("unified", topic, deduped)
    return deduped
