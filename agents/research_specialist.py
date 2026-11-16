import os
from dotenv import load_dotenv
from crewai import Agent, LLM

load_dotenv(override=True)

# LLM configurations - Agent specific config
model = os.getenv("RESEARCH_AGENT_LLM", "groq/openai/gpt-oss-120b")
temperature = float(os.getenv("RESEARCH_AGENT_TEMPERATURE", "0.2"))

llm = LLM(
    model=model,
    temperature=temperature
)

research_specialist_agent = Agent(
    role="Academic Research Specialist",
    goal="Extract and synthesize primary findings, methodologies, and metrics from retrieved academic literature",
    backstory=(
        "You are an expert academic research specialist with deep training in scientific literature review. "
        "You analyze paper abstracts, findings, and empirical claims directly from the academic sources provided to you. "
        "Keep your synthesis under 250 words. Accurately capture author claims without hallucinating."
    ),
    llm=llm,
    tools=[],
    max_iter=3,
    verbose=True,
)
