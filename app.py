import streamlit as st
import os
import time
from dotenv import load_dotenv
from crew import research_crew

# Load environment variables
load_dotenv()


def check_api_keys():
    """Check if required API keys are set"""
    required_vars = ['SERPER_API_KEY', 'GROQ_API_KEY']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    return missing_vars


def run_research_in_thread(research_assistant, topic, progress_container,
                           status_container):
    """Run research in a separate thread"""
    try:
        result = research_assistant.run_research(topic)
        st.session_state.research_result = result
        st.session_state.research_completed = True
        st.session_state.research_error = None
    except Exception as e:
        st.session_state.research_error = str(e)
        st.session_state.research_completed = True


def main():
    """Main Streamlit app"""
    st.set_page_config(
        page_title="AI Research Assistant",
        page_icon="🔬",
        layout="wide"
    )

    st.title("🔬 AI Research Assistant")
    st.markdown("*Powered by CrewAI Multi-Agent System*")

    # Initialize session state
    if 'research_completed' not in st.session_state:
        st.session_state.research_completed = False
    if 'research_result' not in st.session_state:
        st.session_state.research_result = None
    if 'research_error' not in st.session_state:
        st.session_state.research_error = None

    # Sidebar for API key status
    with st.sidebar:
        st.header("⚙️ Configuration")
        missing_vars = check_api_keys()

        if missing_vars:
            st.error("❌ Missing API Keys")
            st.write("Please set the following environment variables:")
            for var in missing_vars:
                st.code(f"{var}=your_api_key_here")
            st.info("💡 Create a .env file in the project root with your API keys")
        else:
            st.success("✅ API Keys Configured")

        st.header("🤖 Multi-Agent System")
        st.markdown("""
        **Research Agents:**
        - 🔍 **Research Specialist**: Gathers information
        - 📊 **Data Analyst**: Analyzes findings
        - ✍️ **Content Writer**: Creates reports
        """)

    # Main content area
    col1, col2 = st.columns([2, 1])

    with col1:
        st.header("📝 Research Topic")
        topic = st.text_input(
            "Enter your research topic:",
            placeholder="e.g., Machine Learning trends in 2024",
            help="Enter any topic you want to research"
        )

        if st.button("🚀 Start Research", type="primary", disabled=bool(missing_vars)):
            if not topic.strip():
                st.error("Please enter a valid research topic")
            else:
                st.session_state.research_completed = False
                st.session_state.research_result = None
                st.session_state.research_error = None

                # Show progress
                progress_container = st.container()
                status_container = st.container()

                with progress_container:
                    st.info("🔄 Research in progress...")
                    progress_bar = st.progress(0)

                    # Simulate progress updates
                    for i in range(101):
                        progress_bar.progress(i)
                        time.sleep(0.1)

                with status_container:
                    st.write("🔍 Research agents are working...")
                    st.write("📊 Analyzing data...")
                    st.write("✍️ Writing report...")

                # Run research
                try:
                    result = research_crew.kickoff({"topic": topic})
                    st.session_state.research_result = result
                    st.session_state.research_completed = True
                    st.session_state.research_error = None
                except Exception as e:
                    st.session_state.research_error = str(e)
                    st.session_state.research_completed = True

                # Clear progress indicators
                progress_container.empty()
                status_container.empty()

    with col2:
        st.header("📊 Status")
        if st.session_state.research_completed:
            if st.session_state.research_error:
                st.error(f"❌ Error: {st.session_state.research_error}")
            else:
                st.success("✅ Research Completed!")
        else:
            st.info("⏳ Waiting for research topic...")

    # Results section
    if st.session_state.research_completed and not st.session_state.research_error:
        st.header("📄 Research Results")

        # Display output files
        output_files = {
            "research_findings.md": "🔍 Research Findings",
            "analysis_report.md": "📊 Analysis Report",
            "final_report.md": "📝 Final Report",
        }

        tabs = st.tabs(list(output_files.values()))

        for i, (filename, title) in enumerate(output_files.items()):
            with tabs[i]:
                if os.path.exists(filename):
                    with open(filename, 'r', encoding='utf-8') as f:
                        content = f.read()
                    st.markdown(content)

                    # Download button
                    st.download_button(
                        label=f"📥 Download {title}",
                        data=content,
                        file_name=filename,
                        mime="text/markdown"
                    )
                else:
                    st.warning(f"File {filename} not found")

    # Footer
    st.markdown("---")
    st.markdown("*Built with CrewAI, Streamlit, and Groq*")


if __name__ == "__main__":
    main()