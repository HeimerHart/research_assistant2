from dotenv import load_dotenv

# Load .env FIRST
load_dotenv()

# Import after loading .env
from crew import research_crew


def run(topic: str):
    result = research_crew.kickoff(inputs={"topic": topic})

    print("-" * 50)
    print(result)
    print("-" * 50)


if __name__ == "__main__":
    run("AI Agents")