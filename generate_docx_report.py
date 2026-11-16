"""
Generate comprehensive Word (.docx) report for Switch-Lit Academic Research Assistant & RAG Engine.
Includes executive summary, ideation, architecture, RAG engine, models used, and embedded visual diagrams.
"""
import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

doc = Document()

# Set standard page margins (1 inch)
for section in doc.sections:
    section.top_margin = Inches(1.0)
    section.bottom_margin = Inches(1.0)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)

# Color constants
C_PRIMARY = RGBColor(15, 23, 42)      # Slate 900
C_SECONDARY = RGBColor(14, 116, 144)  # Cyan/Blue 700
C_BODY = RGBColor(51, 65, 85)         # Slate 700
C_MUTED = RGBColor(100, 116, 139)     # Slate 500

def set_cell_background(cell, color_hex):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

# Document Title Block
title_p = doc.add_paragraph()
title_p.paragraph_format.space_before = Pt(0)
title_p.paragraph_format.space_after = Pt(4)
title_run = title_p.add_run("SWITCH-LIT RESEARCH LIBRARY")
title_run.font.name = "Georgia"
title_run.font.size = Pt(26)
title_run.font.bold = True
title_run.font.color.rgb = C_PRIMARY

subtitle_p = doc.add_paragraph()
subtitle_p.paragraph_format.space_after = Pt(16)
sub_run = subtitle_p.add_run("System Architecture, Ideation, Multi-Agent Orchestration & RAG Engine Technical Report")
sub_run.font.name = "Arial"
sub_run.font.size = Pt(12)
sub_run.font.italic = True
sub_run.font.color.rgb = C_SECONDARY

# Meta info table
meta_table = doc.add_table(rows=2, cols=2)
meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
meta_data = [
    ("Date: November 2026", "Platform: FastAPI, React 19, CrewAI, Groq"),
    ("Author: Engineering Team", "Repository: HeimerHart/research_assistant2")
]
for row_idx, (col1, col2) in enumerate(meta_data):
    row = meta_table.rows[row_idx]
    c1, c2 = row.cells[0], row.cells[1]
    c1.text = col1
    c2.text = col2
    set_cell_background(c1, "F8FAFC")
    set_cell_background(c2, "F8FAFC")
    for c in (c1, c2):
        c.paragraphs[0].runs[0].font.size = Pt(9.5)
        c.paragraphs[0].runs[0].font.color.rgb = C_MUTED

doc.add_paragraph().paragraph_format.space_after = Pt(12)

# --- 1. EXECUTIVE SUMMARY ---
h1 = doc.add_heading(level=1)
r1 = h1.add_run("1. Executive Summary")
r1.font.name = "Georgia"
r1.font.color.rgb = C_PRIMARY

p = doc.add_paragraph()
p.add_run(
    "The Switch-Lit Research Library is an autonomous academic discovery and synthesis engine designed to bridge the gap "
    "between vast scientific repositories and decision-ready literature reviews. Traditional literature review processes "
    "are labor-intensive, fragmented across disparate indices (arXiv, Zenodo, OpenAlex), and prone to hallucination when "
    "summarized using standard conversational LLMs. "
    "\n\n"
    "Switch-Lit solves this by unifying an editorial, library-inspired React 19 frontend with an asynchronous FastAPI backend. "
    "The core engine combines live academic API retrieval, automated PDF ingestion, a local hybrid BM25/Vector RAG space, and "
    "a sequential three-agent CrewAI orchestration powered by Groq's high-capacity openai/gpt-oss-120b model. "
    "The platform features real-time Server-Sent Events (SSE) telemetry, persistent inquiry history, full-text PDF access, "
    "and an interactive 'Ask Papers' conversational drawer for deep Q&A."
)
p.runs[0].font.size = Pt(10.5)
p.runs[0].font.color.rgb = C_BODY

# --- 2. IDEATION & DESIGN PHILOSOPHY ---
h2 = doc.add_heading(level=1)
r2 = h2.add_run("2. Ideation & Design Philosophy")
r2.font.name = "Georgia"
r2.font.color.rgb = C_PRIMARY

p = doc.add_paragraph()
p.add_run(
    "2.1 The Problem Space:\n"
    "Most AI research assistants operate merely as basic web-search scrapers. They pull shallow snippets from marketing blogs "
    "and general websites using basic search APIs, missing peer-reviewed conference papers, empirical datasets, and verified DOIs. "
    "Furthermore, common AI interfaces feel sterile or 'vibe-coded'—overloaded with harsh neon dark-modes and distracting animations.\n\n"
    "2.2 The Solution Concept: 'Switch-Lit Library':\n"
    "Inspired by the collective imagination of physical libraries and classic editorial publications, Switch-Lit adopts a clean, "
    "tactile aesthetic characterized by natural paper cream tones (#fbfbf9), deep charcoal typography (#111110), Instrument Serif headings, "
    "and distinct book-cover proportions. The software behaves not like a chat-box, but like an open research desk."
)
p.runs[0].font.size = Pt(10.5)
p.runs[0].font.color.rgb = C_BODY

# Embed Figure 2: Process Flow
if os.path.exists("report_assets/process_flow.png"):
    doc.add_picture("report_assets/process_flow.png", width=Inches(6.2))
    caption = doc.add_paragraph()
    caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
    c_run = caption.add_run("Figure 1: End-to-End User Experience & Processing Pipeline")
    c_run.font.size = Pt(9)
    c_run.font.italic = True
    c_run.font.color.rgb = C_MUTED

# --- 3. RETRIEVAL-AUGMENTED GENERATION (RAG) ARCHITECTURE ---
h3 = doc.add_heading(level=1)
r3 = h3.add_run("3. Retrieval-Augmented Generation (RAG) Engine")
r3.font.name = "Georgia"
r3.font.color.rgb = C_PRIMARY

p = doc.add_paragraph()
p.add_run(
    "The core technical differentiator of Switch-Lit is its grounded multi-stage RAG architecture, ensuring that every claim in "
    "the synthesized report links back to a primary open-access publication.\n\n"
    "3.1 Academic Repository Ingestion:\n"
    "• arXiv API: Connects to the official Atom feed, extracting preprints, subject classifications, and direct PDF downloads.\n"
    "• Zenodo API: Queries CERN's Open Science repository for conference papers, software artifacts, and registered DOIs.\n"
    "• OpenAlex API: Queries a catalog of 250M+ scholarly works, retrieving conference venues, citation counts, and publisher locations.\n\n"
    "3.2 Extraction & Semantic Chunking:\n"
    "When candidate papers are identified, the Python backend fetches their full PDF documents via pypdf/pymupdf. If a PDF is behind a firewall "
    "or times out, it gracefully falls back to the peer-reviewed abstract. Text is cleaned, normalized, and partitioned into overlapping "
    "700-character semantic passages with 100-character strides. Each passage retains strict provenance metadata:\n"
    "  { paper_id, paper_title, authors, source, url, doi, chunk_index }\n\n"
    "3.3 Hybrid BM25/Similarity Vector Index:\n"
    "Indexed passages reside in an in-memory RAG index. The retrieval algorithm employs term-frequency scoring with logarithmic scaling "
    "and title relevance boosts. This enables instantaneous sub-millisecond retrieval without requiring external vector DB subscription costs."
)
p.runs[0].font.size = Pt(10.5)
p.runs[0].font.color.rgb = C_BODY

# Embed Figure 1: RAG Architecture
if os.path.exists("report_assets/rag_architecture.png"):
    doc.add_picture("report_assets/rag_architecture.png", width=Inches(6.2))
    caption = doc.add_paragraph()
    caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
    c_run = caption.add_run("Figure 2: Grounded RAG Ingestion, Indexing, and Retrieval Flow")
    c_run.font.size = Pt(9)
    c_run.font.italic = True
    c_run.font.color.rgb = C_MUTED

# --- 4. MULTI-AGENT ORCHESTRATION & LLM MODEL ---
h4 = doc.add_heading(level=1)
r4 = h4.add_run("4. Multi-Agent Orchestration & Model Specifications")
r4.font.name = "Georgia"
r4.font.color.rgb = C_PRIMARY

p = doc.add_paragraph()
p.add_run(
    "4.1 Multi-Agent Task Division:\n"
    "Rather than submitting a single prompt to an LLM, Switch-Lit divides the synthesis task among three specialized CrewAI agents:\n"
    "1. Research Specialist Agent: Responsible for literature extraction, isolating core problem statements, and capturing quantitative benchmarks.\n"
    "2. Data Analyst Agent: Cross-examines experimental setups, compares conflicting methodologies across the papers, and eliminates unverified claims.\n"
    "3. Content Writer Agent: Structures the findings into an editorial academic report comprising Executive Summary, Methodology Matrix, "
    "Findings, Recommendations, and a strict References section citing inline references ([1], [2]).\n\n"
    "4.2 Model Selection & Groq Inference:\n"
    "Switch-Lit utilizes Groq's high-throughput LPU inference engine running openai/gpt-oss-120b. This model was chosen for several reasons:\n"
    "• Parameter Scale (120B): Superior reasoning capacity, capable of parsing dense mathematical, quantum, and machine learning abstracts.\n"
    "• Deterministic Grounding: Low temperature configuration (0.2) prevents hallucination and strictly constrains output to provided citations.\n"
    "• High Token Processing Velocity: Generates multi-page academic briefs in under 15 seconds, streaming tokens directly to the user."
)
p.runs[0].font.size = Pt(10.5)
p.runs[0].font.color.rgb = C_BODY

# Embed Figure 3: Agent Diagram
if os.path.exists("report_assets/multi_agent_flow.png"):
    doc.add_picture("report_assets/multi_agent_flow.png", width=Inches(5.8))
    caption = doc.add_paragraph()
    caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
    c_run = caption.add_run("Figure 3: Sequential Multi-Agent Task Execution")
    c_run.font.size = Pt(9)
    c_run.font.italic = True
    c_run.font.color.rgb = C_MUTED

# --- 5. COMPONENT & TECH STACK INVENTORY ---
h5 = doc.add_heading(level=1)
r5 = h5.add_run("5. Full Component & Technology Inventory")
r5.font.name = "Georgia"
r5.font.color.rgb = C_PRIMARY

table = doc.add_table(rows=1, cols=3)
table.alignment = WD_TABLE_ALIGNMENT.CENTER
hdr = table.rows[0].cells
hdr[0].text = "Subsystem"
hdr[1].text = "Technology / Library"
hdr[2].text = "Functional Ownership"
for c in hdr:
    set_cell_background(c, "E2E8F0")
    c.paragraphs[0].runs[0].font.bold = True
    c.paragraphs[0].runs[0].font.size = Pt(9.5)

rows_data = [
    ("Frontend UI", "React 19, TypeScript, Vite", "Client rendering, state management, and view routing"),
    ("Styling & Tokens", "Tailwind CSS v4, Instrument Serif", "Editorial newspaper theme, pastel book covers, custom scrollbars"),
    ("Motion & Animation", "Framer Motion", "Fluid accordion expansion, modal popups, and drawer slides"),
    ("API & Telemetry", "FastAPI, Uvicorn, SSE", "Streaming stdout agent logs, REST endpoints, and keep-alives"),
    ("Agent Framework", "CrewAI 1.15.33, LiteLLM", "Multi-agent coordination, sequential execution, prompt injection"),
    ("LLM Inference", "Groq LPU (gpt-oss-120b)", "Ultra-fast text generation, synthesis, and Q&A inference"),
    ("PDF Extraction", "pypdf, PyMuPDF", "Byte-stream decoding, multi-page text parsing, abstract fallback"),
    ("Academic APIs", "arXiv API, Zenodo REST, OpenAlex", "Primary open-access paper querying and DOI resolution"),
    ("Local Caching", "Disk JSON & LocalStorage", "Query caching across runs and persistent inquiry catalog")
]

for sub, tech, role in rows_data:
    row = table.add_row().cells
    row[0].text = sub
    row[1].text = tech
    row[2].text = role
    set_cell_background(row[0], "F8FAFC")
    for cell in row:
        cell.paragraphs[0].runs[0].font.size = Pt(9)
        cell.paragraphs[0].runs[0].font.color.rgb = C_BODY

doc.add_paragraph().paragraph_format.space_after = Pt(12)

# --- 6. USER FEATURES & CAPABILITIES ---
h6 = doc.add_heading(level=1)
r6 = h6.add_run("6. User Interaction & Operational Features")
r6.font.name = "Georgia"
r6.font.color.rgb = C_PRIMARY

p = doc.add_paragraph()
p.add_run(
    "1. One-Click Paper Modal & Direct PDF Download:\n"
    "Users can click any featured research card to review author credits, publication dates, DOIs, and full abstracts, with a direct "
    "'Download PDF' link pointing straight to the official open-access document.\n\n"
    "2. Interactive 'Ask Papers' RAG Chat Drawer:\n"
    "A slide-over drawer accessible from the top navigation allows users to converse with the retrieved papers. Questions such as "
    "'What benchmark dataset did paper [1] use?' or 'How do the methodologies compare?' are answered strictly from the indexed paper text.\n\n"
    "3. Real-Time Telemetry Console:\n"
    "During execution, an embedded terminal streams agent reasoning steps, search queries, and RAG ingestion counts in real time.\n\n"
    "4. Persistent History & Catalog:\n"
    "The bottom archive table maintains a history of past inquiries with word counts and dates, allowing users to switch between reports "
    "even after closing or refreshing the browser."
)
p.runs[0].font.size = Pt(10.5)
p.runs[0].font.color.rgb = C_BODY

# --- 7. CONCLUSION & ROADMAP ---
h7 = doc.add_heading(level=1)
r7 = h7.add_run("7. Conclusion & Future Roadmap")
r7.font.name = "Georgia"
r7.font.color.rgb = C_PRIMARY

p = doc.add_paragraph()
p.add_run(
    "Switch-Lit successfully demonstrates how modern AI multi-agent orchestration and grounded RAG can transform academic research "
    "from a tedious manual chore into an engaging, verified editorial experience. By eliminating hallucinated search queries and directly "
    "indexing literature from arXiv, Zenodo, and OpenAlex, the platform provides researchers with reliable, verifiable intelligence.\n\n"
    "Future Enhancements:\n"
    "• Vector Embedding Persistence (Pinecone / ChromaDB on disk) for cross-session semantic search across thousands of papers.\n"
    "• Direct LaTeX / BibTeX export for immediate copy-pasting into academic papers.\n"
    "• Automated citation graph analysis showing parent and child citations for retrieved papers."
)
p.runs[0].font.size = Pt(10.5)
p.runs[0].font.color.rgb = C_BODY

output_filename = "Switch_Lit_Research_Platform_Report.docx"
doc.save(output_filename)
print(f"Report successfully saved as {output_filename}")
