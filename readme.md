### AI research Assistant

An AI-powered multi-agent research assistant built using **CrewAI**, **Groq LLM**, and **Serper Search**. The system autonomously researches a topic, analyzes the collected information, and produces a well-structured report through collaborative AI agents.

---

# Table of Contents

1. Overview
2. Features
3. System Architecture
4. Project Structure
5. Workflow
6. Flowchart
7. Agents
8. Tasks
9. Technologies Used
10. Installation
11. Environment Variables
12. Running the Project
13. Output
14. Future Improvements
15. License

---

# Overview

This project demonstrates how multiple AI agents can collaborate to automate the research and report generation process.

Instead of relying on a single LLM prompt, the project divides the work among specialized agents:

- Research Specialist
- Data Analyst
- Content Writer

Each agent performs a dedicated task, improving modularity, scalability, and output quality.

---

# Features

- Multi-Agent AI Workflow using CrewAI
- Internet Search using Serper API
- Groq LLM Integration
- Automatic Research
- Data Analysis
- Professional Report Generation
- Modular Architecture
- Easily Extendable
- Configurable through Environment Variables

---

# System Architecture

```
                     User Input
                          │
                          ▼
                 Topic for Research
                          │
                          ▼
                 CrewAI Orchestrator
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
Research Agent      Analyst Agent     Writer Agent
        │                 │                 │
        ▼                 ▼                 ▼
Internet Search    Information Analysis  Report Writing
        │                 │                 │
        └─────────────────┼─────────────────┘
                          ▼
                 Final Research Report
```

---

# Project Structure

```
research_assistant/
│
├── agents/
│   ├── research_specialist.py
│   ├── data_analyst.py
│   └── content_writer.py
│
├── tasks/
│   ├── research_task.py
│   ├── analysis_task.py
│   └── writing_task.py
│
├── crew.py
├── main.py
├── .env
├── requirements.txt
├── README.md
└── research_findings.md
```

---

# Workflow

The execution begins when the user provides a research topic.

Example:

```
Artificial Intelligence
```

The CrewAI framework then assigns responsibilities to different agents.

## Step 1 – Research Specialist

Responsibilities

- Search the internet
- Collect latest information
- Gather statistics
- Find expert opinions
- Verify sources

Output

```
Structured research notes
```

↓

## Step 2 – Data Analyst

Responsibilities

- Analyze research
- Identify trends
- Extract insights
- Compare different viewpoints
- Highlight important findings

Output

```
Analytical summary
```

↓

## Step 3 – Content Writer

Responsibilities

- Convert analysis into a readable report
- Improve readability
- Organize sections
- Generate professional documentation

Output

```
Final Research Report
```

---

# Complete Flowchart

```text
                     ┌─────────────────────┐
                     │      Start          │
                     └──────────┬──────────┘
                                │
                                ▼
                  User enters research topic
                                │
                                ▼
                 CrewAI initializes workflow
                                │
                                ▼
               Creates Research Specialist Agent
                                │
                                ▼
             Searches Internet using Serper Tool
                                │
                                ▼
             Collects facts, statistics, sources
                                │
                                ▼
               Passes results to Data Analyst
                                │
                                ▼
             Cleans and analyzes information
                                │
                                ▼
            Identifies patterns and key insights
                                │
                                ▼
              Sends analysis to Content Writer
                                │
                                ▼
          Generates structured research document
                                │
                                ▼
                Saves report to output file
                                │
                                ▼
                           End Process
```

---

# Agent Details

## Research Specialist

Purpose

Responsible for collecting relevant information from the internet.

Responsibilities

- Search reliable sources
- Gather latest information
- Verify facts
- Collect statistics
- Organize findings

Tools

- Serper Search API
- Groq LLM

---

## Data Analyst

Purpose

Processes raw research into meaningful insights.

Responsibilities

- Compare information
- Find trends
- Detect patterns
- Organize research logically
- Summarize findings

LLM

Groq Llama 3.3 70B

---

## Content Writer

Purpose

Transforms analyzed information into a professional report.

Responsibilities

- Create readable content
- Improve structure
- Add headings
- Maintain logical flow
- Produce final report

LLM

Groq Llama 3.3 70B

---

# Tasks

## Research Task

Input

```
Topic
```

Output

```
Detailed research summary
```

---

## Analysis Task

Input

```
Research Summary
```

Output

```
Detailed analysis
```

---

## Writing Task

Input

```
Research + Analysis
```

Output

```
Professional report
```

---

# Technologies Used

| Technology    | Purpose                |
| ------------- | ---------------------- |
| Python        | Backend                |
| CrewAI        | Multi-Agent Framework  |
| Groq          | Large Language Model   |
| Serper API    | Web Search             |
| python-dotenv | Environment Variables  |
| LiteLLM       | LLM Provider Interface |

---

# Installation

Clone the repository

```bash
git clone https://github.com/username/research_assistant.git
```

Navigate to the project

```bash
cd research_assistant
```

Create virtual environment

```bash
python -m venv venv
```

Activate

Windows

```bash
venv\Scripts\activate
```

Linux / macOS

```bash
source venv/bin/activate
```

Install dependencies

```bash
pip install -r requirements.txt
```

---

# Environment Variables

Create a `.env` file.

```
GROQ_API_KEY=YOUR_GROQ_KEY

SERPER_API_KEY=YOUR_SERPER_KEY

RESEARCH_AGENT_LLM=groq/llama-3.3-70b-versatile
ANALYST_AGENT_LLM=groq/llama-3.3-70b-versatile
WRITER_AGENT_LLM=groq/llama-3.3-70b-versatile

RESEARCH_AGENT_TEMPERATURE=0.1
ANALYST_AGENT_TEMPERATURE=0.2
WRITER_AGENT_TEMPERATURE=0.3
```

---

# Running the Project

Execute

```bash
python main.py
```

Example

```
Topic:
Artificial Intelligence
```

---

# Expected Output

```
Research Findings

Introduction

Recent Developments

Market Trends

Key Statistics

Expert Opinions

Challenges

Future Scope

Conclusion

References
```

The generated report is automatically saved as

```
research_findings.md
```

---

# Advantages of Multi-Agent Systems

- Better reasoning
- Modular architecture
- Easier debugging
- Task specialization
- Higher quality outputs
- Easily scalable
- Supports additional agents
- Improved maintainability

---

# Future Improvements

- PDF Export
- Streamlit Web Interface
- Citation Generation
- Vector Database Integration
- Retrieval-Augmented Generation (RAG)
- Memory-enabled Agents
- Multi-language Support
- Agent Performance Monitoring
- Real-time Web Research
- Report Versioning

---

# Future Architecture

```
                  User
                    │
                    ▼
               Streamlit UI
                    │
                    ▼
             CrewAI Orchestrator
                    │
    ┌───────────────┼────────────────┐
    ▼               ▼                ▼
Research       Data Analyst     Content Writer
    │               │                │
    ▼               ▼                ▼
 Serper        Analysis Agent   Report Generator
    │
    ▼
Vector Database (Future)
    │
    ▼
Knowledge Retrieval
```

---

# License

This project is developed for educational and research purposes. It demonstrates the implementation of collaborative AI agents using CrewAI for autonomous research, analysis, and content generation.
"# research_assistant2" 
