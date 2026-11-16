
from dotenv import load_dotenv

load_dotenv(override=True)

from crew import research_crew


def run(topic: str):
    try:
        print(f"\nStarting research on: {topic}\n")

        result = research_crew.kickoff(
            inputs={"topic": topic}
        )

        print("\n" + "=" * 60)
        print("RESEARCH COMPLETED")
        print("=" * 60)
        print(result)
        print("=" * 60)

        return result

    except Exception as e:
        print(f"\nResearch failed: {type(e).__name__}: {e}")
        raise


if __name__ == "__main__":
    topic=input("Topic: ")
    run(topic)
