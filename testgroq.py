from dotenv import load_dotenv
from crewai import LLM

load_dotenv()

llm = LLM(
    model="groq/openai/gpt-oss-120b",
    temperature=0
)

response = llm.call("Say hello in one sentence.")
print(response)