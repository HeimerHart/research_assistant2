"""
Generate visual architectural diagrams for the Switch-Lit Research Library report.
"""
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import os

os.makedirs("report_assets", exist_ok=True)

# 1. RAG Architecture Diagram
def generate_rag_diagram():
    fig, ax = plt.subplots(figsize=(10, 5), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 5)
    ax.axis("off")

    # Colors
    c_blue = "#dbeafe"
    c_green = "#dcfce7"
    c_purple = "#f3e8ff"
    c_amber = "#fef3c7"
    border = "#1e293b"

    # Boxes
    # Sources
    ax.add_patch(patches.FancyBboxPatch((0.5, 2.8), 2.2, 1.6, boxstyle="round,pad=0.1", fc=c_blue, ec=border, lw=1.5))
    ax.text(1.6, 4.0, "Academic Sources", ha="center", va="center", weight="bold", fontsize=10)
    ax.text(1.6, 3.5, "• arXiv (Open Preprints)\n• Zenodo (DOIs & Repos)\n• OpenAlex (Conferences)", ha="center", va="center", fontsize=8)

    # Ingestion & Chunking
    ax.add_patch(patches.FancyBboxPatch((3.5, 2.8), 2.6, 1.6, boxstyle="round,pad=0.1", fc=c_green, ec=border, lw=1.5))
    ax.text(4.8, 4.0, "RAG Ingestion Engine", ha="center", va="center", weight="bold", fontsize=10)
    ax.text(4.8, 3.4, "• PDF/Abstract Parser\n• Semantic Chunking (700c)\n• Metadata (DOI, URL, Year)", ha="center", va="center", fontsize=8)

    # Vector / Search Index
    ax.add_patch(patches.FancyBboxPatch((6.8, 2.8), 2.7, 1.6, boxstyle="round,pad=0.1", fc=c_purple, ec=border, lw=1.5))
    ax.text(8.15, 4.0, "Vector / Hybrid Store", ha="center", va="center", weight="bold", fontsize=10)
    ax.text(8.15, 3.4, "• BM25 / Similarity Index\n• Title & Keyword Boosting\n• In-Memory / Persistent Cache", ha="center", va="center", fontsize=8)

    # User Query & Synthesis
    ax.add_patch(patches.FancyBboxPatch((1.5, 0.4), 2.8, 1.5, boxstyle="round,pad=0.1", fc=c_amber, ec=border, lw=1.5))
    ax.text(2.9, 1.4, "User Query & Topic", ha="center", va="center", weight="bold", fontsize=10)
    ax.text(2.9, 0.9, "Frontend Search & Chat Drawer\n'Ask Papers' Interaction", ha="center", va="center", fontsize=8)

    # LLM Synthesis & Grounding
    ax.add_patch(patches.FancyBboxPatch((5.5, 0.4), 3.8, 1.5, boxstyle="round,pad=0.1", fc=c_blue, ec=border, lw=1.5))
    ax.text(7.4, 1.4, "LLM Synthesis & Reasoning", ha="center", va="center", weight="bold", fontsize=10)
    ax.text(7.4, 0.9, "• Groq openai/gpt-oss-120b Engine\n• Grounded Citations [1], [2]\n• CrewAI Multi-Agent Pipeline", ha="center", va="center", fontsize=8)

    # Arrows
    arrow_props = dict(arrowstyle="->", lw=1.5, color="#334155")
    ax.annotate("", xy=(3.5, 3.6), xytext=(2.7, 3.6), arrowprops=arrow_props)
    ax.annotate("", xy=(6.8, 3.6), xytext=(6.1, 3.6), arrowprops=arrow_props)
    ax.annotate("", xy=(5.5, 1.15), xytext=(4.3, 1.15), arrowprops=arrow_props)
    ax.annotate("", xy=(7.4, 2.8), xytext=(7.4, 1.9), arrowprops=arrow_props)

    plt.title("Figure 1: Switch-Lit RAG & Academic Indexing Architecture", fontsize=12, pad=10, weight="bold")
    plt.tight_layout()
    plt.savefig("report_assets/rag_architecture.png", dpi=300)
    plt.close()

# 2. Ideation & Flow Diagram
def generate_flow_diagram():
    fig, ax = plt.subplots(figsize=(11, 4.5), dpi=300)
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 4.5)
    ax.axis("off")

    stages = [
        ("1. Inquiry", "User enters research\ntopic or clicks\nfeatured paper card", "#e2e8f0"),
        ("2. Discovery", "Query arXiv, Zenodo,\nOpenAlex with\nMD5 disk cache", "#bfdbfe"),
        ("3. Ingestion", "Extract text/PDF,\nchunk & index in\nRAG Vector Space", "#bbf7d0"),
        ("4. CrewAI", "Specialist -> Analyst\n-> Writer synthesize\ncomparative brief", "#fef08a"),
        ("5. Interaction", "Editorial UI rendering,\nPDF download &\nlive RAG Q&A drawer", "#e9d5ff")
    ]

    for idx, (title, desc, color) in enumerate(stages):
        x = 0.5 + idx * 2.1
        ax.add_patch(patches.FancyBboxPatch((x, 1.2), 1.7, 2.2, boxstyle="round,pad=0.15", fc=color, ec="#0f172a", lw=1.5))
        ax.text(x + 0.85, 3.0, title, ha="center", va="center", weight="bold", fontsize=10)
        ax.text(x + 0.85, 2.1, desc, ha="center", va="center", fontsize=8)

        if idx < len(stages) - 1:
            ax.annotate("", xy=(x + 2.1, 2.3), xytext=(x + 1.7, 2.3),
                        arrowprops=dict(arrowstyle="->", lw=2, color="#0f172a"))

    plt.title("Figure 2: Complete End-to-End User Experience & Processing Flow", fontsize=12, pad=10, weight="bold")
    plt.tight_layout()
    plt.savefig("report_assets/process_flow.png", dpi=300)
    plt.close()

# 3. Multi-Agent Orchestration Diagram
def generate_agent_diagram():
    fig, ax = plt.subplots(figsize=(9, 4), dpi=300)
    ax.set_xlim(0, 9)
    ax.set_ylim(0, 4)
    ax.axis("off")

    agents = [
        ("Agent 1: Research Specialist", "Role: Literature Discovery\n• Grounded in arXiv/Zenodo chunks\n• Extracts metrics, dates, & URLs", "#dbeafe"),
        ("Agent 2: Data Analyst", "Role: Evidence Verification\n• Cross-compares methodology\n• Eliminates hallucinations", "#dcfce7"),
        ("Agent 3: Content Writer", "Role: Editorial Manuscript\n• Drafts executive synthesis\n• Compiles bibliography & links", "#ffedd5")
    ]

    for idx, (title, desc, color) in enumerate(agents):
        x = 0.5 + idx * 2.8
        ax.add_patch(patches.FancyBboxPatch((x, 0.8), 2.4, 2.2, boxstyle="round,pad=0.15", fc=color, ec="#1e293b", lw=1.5))
        ax.text(x + 1.2, 2.6, title, ha="center", va="center", weight="bold", fontsize=9)
        ax.text(x + 1.2, 1.7, desc, ha="center", va="center", fontsize=8)

        if idx < len(agents) - 1:
            ax.annotate("", xy=(x + 2.8, 1.9), xytext=(x + 2.4, 1.9),
                        arrowprops=dict(arrowstyle="->", lw=2, color="#1e293b"))

    plt.title("Figure 3: Sequential Multi-Agent Collaborative Tasking", fontsize=12, pad=10, weight="bold")
    plt.tight_layout()
    plt.savefig("report_assets/multi_agent_flow.png", dpi=300)
    plt.close()

if __name__ == "__main__":
    generate_rag_diagram()
    generate_flow_diagram()
    generate_agent_diagram()
    print("All architectural diagrams generated in report_assets/")
