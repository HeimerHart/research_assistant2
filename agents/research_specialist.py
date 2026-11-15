import os
from dotenv import load_dotenv
from crewai import Agent, LLM
from crewai_tools import SerperDevTool

load_dotenv(override=True)


# LLM configurations - Agent specific config
model = os.getenv("RESEARCH_AGENT_LLM", "groq/openai/gpt-oss-120b")
temperature = float(os.getenv("RESEARCH_AGENT_TEMPERATURE", "0.2"))

llm = LLM(
    model=model,
    temperature=temperature
)

research_specialist_agent = Agent(
    role="Research Specialist",
    goal="Gather comprehensive and accurate information on given topics from multiple sources",
    backstory = (
                "You are an expert research specialist with years of experience in information gathering "
                "and fact-checking. You have a keen eye for reliable sources and can quickly identify the "
                "most relevant and up-to-date information on any topic."
                "Keep the entire summary under 200 words. Use at most 2 searches."
                "Use ONLY the search tool you were given. Never call open_file, browser, or any other tool. Do not open URLs; rely on the search result snippets."
            ),
    llm=llm,
    tools=[SerperDevTool(n_results=3)],         # was SerperDevTool()
    max_iter=4,     
    verbose=True,
<<<<<<< HEAD

)
=======
)
>>>>>>> bd0ca9e73c3ac56ec748b99a0ae645ea76c432f5
