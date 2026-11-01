from dotenv import load_dotenv
from crewai import LLM

load_dotenv()

llm = LLM(
    model="groq/llama-3.3-70b-versatile",
    temperature=0
)

response = llm.call("Say hello in one sentence.")
print(response)