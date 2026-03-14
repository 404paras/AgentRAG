from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from crewai_tools import SerperDevTool, ScrapeWebsiteTool
from crewai import Agent, Task, Crew, LLM
import uvicorn

# Load environment variables (fallback / server-level defaults)
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="AgentRAG Service", version="2.0.0")

# Server-level env fallbacks (used if user has not provided keys)
DEFAULT_GROQ_API_KEY = os.getenv("GROQ_API_KEY")
DEFAULT_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DEFAULT_SERPER_API_KEY = os.getenv("SERPER_API_KEY")
RAG_SERVICE_PORT = int(os.getenv("RAG_SERVICE_PORT", "8000"))
RAG_SERVICE_HOST = os.getenv("RAG_SERVICE_HOST", "0.0.0.0")

# Request/Response models
class ChatRequest(BaseModel):
    query: str
    context: str
    noteTitle: Optional[str] = "the document"
    # Per-user API keys (decrypted, sent by Node backend over internal network)
    groq_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    serper_api_key: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    used_web_search: bool = False
    llm_provider: Optional[str] = None


def build_chat_llm(request: ChatRequest):
    """Build the primary chat LLM. Prefers Groq; falls back to Gemini."""
    groq_key = request.groq_api_key or DEFAULT_GROQ_API_KEY
    gemini_key = request.gemini_api_key or DEFAULT_GEMINI_API_KEY

    if groq_key:
        return ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0,
            max_tokens=500,
            timeout=None,
            max_retries=2,
            groq_api_key=groq_key,
        ), "groq"

    if gemini_key:
        return ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            temperature=0,
            max_output_tokens=500,
            google_api_key=gemini_key,
        ), "gemini"

    raise ValueError("No LLM API key available. Please add a Groq or Gemini key in Settings.")


def build_crew_llm(request: ChatRequest):
    """Build the CrewAI LLM (prefers Gemini, falls back to Groq)."""
    gemini_key = request.gemini_api_key or DEFAULT_GEMINI_API_KEY
    groq_key = request.groq_api_key or DEFAULT_GROQ_API_KEY

    if gemini_key:
        return LLM(
            model="gemini/gemini-2.0-flash",
            api_key=gemini_key,
            max_tokens=500,
            temperature=0.7,
        )
    if groq_key:
        return LLM(
            model="groq/llama-3.3-70b-versatile",
            api_key=groq_key,
            max_tokens=500,
            temperature=0.7,
        )
    return None


ROUTER_PROMPT = '''Role: Question-Answering Assistant
Task: Determine whether the system can answer the user's question based on the provided text.
Instructions:
    - Analyze the text and identify if it contains the necessary information to answer the user's question.
    - Provide a clear and concise response indicating whether the system can answer the question or not.
    - Your response should include only a single word. Nothing else, no other text, information, header/footer. 
Output Format:
    - Answer: Yes/No
Study the below examples and based on that, respond to the last question. 
Examples:
    Input: 
        Text: The capital of France is Paris.
        User Question: What is the capital of France?
    Expected Output:
        Answer: Yes
    Input: 
        Text: The population of the United States is over 330 million.
        User Question: What is the population of China?
    Expected Output:
        Answer: No
    Input:
        User Question: {query}
        Text: {text}
'''


def check_local_knowledge(query: str, context: str, llm) -> bool:
    """Router function to determine if we can answer from local knowledge."""
    if not llm:
        return True
    formatted_prompt = ROUTER_PROMPT.format(text=context[:3000], query=query)
    try:
        response = llm.invoke(formatted_prompt)
        return response.content.strip().lower() == "yes"
    except Exception as e:
        print(f"Error checking local knowledge: {e}")
        return True


def setup_web_scraping_crew(topic: str, crew_llm, serper_key: Optional[str]):
    """Setup the web scraping crew for a specific topic."""
    effective_serper = serper_key or DEFAULT_SERPER_API_KEY
    if not crew_llm or not effective_serper:
        return None
    try:
        # Set SERPER_API_KEY in env so SerperDevTool picks it up
        os.environ["SERPER_API_KEY"] = effective_serper

        search_tool = SerperDevTool()
        scrape_website = ScrapeWebsiteTool()

        web_search_agent = Agent(
            role="Expert Web Search Agent",
            goal="Identify and retrieve relevant web data for user queries",
            backstory="An expert in identifying valuable web sources for the user's needs",
            allow_delegation=False,
            verbose=True,
            llm=crew_llm
        )
        web_scraper_agent = Agent(
            role="Expert Web Scraper Agent",
            goal="Extract and analyze content from specific web pages identified by the search agent",
            backstory="A highly skilled web scraper, capable of analyzing and summarizing website content accurately",
            allow_delegation=False,
            verbose=True,
            llm=crew_llm
        )
        search_task = Task(
            description=(
                f"Identify the most relevant web page or article for the topic: '{topic}'. "
                "Use all available tools to search for and provide a link to a web page "
                "that contains valuable information about the topic. Keep your response concise."
            ),
            expected_output=(
                f"A concise summary of the most relevant web page or article for '{topic}', "
                "including the link to the source and key points from the content."
            ),
            tools=[search_tool],
            agent=web_search_agent,
        )
        scraping_task = Task(
            description=(
                f"Extract and analyze data from the given web page or website. Focus on the key sections "
                f"that provide insights into the topic: '{topic}'. Use all available tools to retrieve the content, "
                "and summarize the key findings in a concise manner."
            ),
            expected_output=(
                f"A detailed summary of the content from the given web page or website, highlighting the key insights "
                f"and explaining their relevance to the topic: '{topic}'. Ensure clarity and conciseness."
            ),
            tools=[scrape_website],
            agent=web_scraper_agent,
        )
        crew = Crew(
            agents=[web_search_agent, web_scraper_agent],
            tasks=[search_task, scraping_task],
            verbose=1,
            memory=False,
        )
        return crew
    except Exception as e:
        print(f"Error setting up web scraping crew: {e}")
        return None


def get_web_content(query: str, crew_llm, serper_key: Optional[str]) -> Optional[str]:
    """Get content from web scraping using CrewAI."""
    crew = setup_web_scraping_crew(query, crew_llm, serper_key)
    if not crew:
        return None
    try:
        result = crew.kickoff()
        return result.raw
    except Exception as e:
        print(f"Error getting web content: {e}")
        return None


def generate_final_answer(context: str, query: str, note_title: str, llm) -> str:
    """Generate final answer using LLM."""
    if not llm:
        return f"Based on {note_title}: {context[:1000]}..."
    messages = [
        (
            "system",
            f'You are a helpful assistant answering questions about "{note_title}". '
            "Use the provided context to answer the query accurately and comprehensively. "
            "Provide a clear, well-organized response.",
        ),
        ("system", f"Context: {context}"),
        ("human", query),
    ]
    try:
        response = llm.invoke(messages)
        return response.content
    except Exception as e:
        print(f"Error generating answer: {e}")
        return f"Based on the document: {context[:1000]}..."


def process_query(query: str, context: str, note_title: str, llm, crew_llm, serper_key: Optional[str]) -> tuple[str, bool]:
    """Process query using agentic RAG with optional web search."""
    print(f"Processing query: {query}")

    can_answer_locally = check_local_knowledge(query, context, llm)
    print(f"Can answer locally: {can_answer_locally}")

    used_web_search = False
    final_context = context

    if not can_answer_locally:
        web_content = get_web_content(query, crew_llm, serper_key)
        if web_content:
            final_context = f"Local Context:\n{context}\n\nWeb Search Results:\n{web_content}"
            used_web_search = True
            print("Retrieved additional context from web scraping")
        else:
            print("Web search unavailable, using local context only")

    answer = generate_final_answer(final_context, query, note_title, llm)
    return answer, used_web_search


# API Endpoints
@app.get("/")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "AgentRAG",
        "supported_providers": ["groq", "gemini"],
        "default_groq_configured": bool(DEFAULT_GROQ_API_KEY),
        "default_gemini_configured": bool(DEFAULT_GEMINI_API_KEY),
        "default_serper_configured": bool(DEFAULT_SERPER_API_KEY),
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Process a chat message with Agentic RAG.
    Supports Groq, Gemini (Google), and Anthropic as LLM backends.
    Per-user API keys are passed by the Node.js backend.
    Falls back to web search via CrewAI (Serper) when the local context is insufficient.
    """
    try:
        # Build LLMs for this request
        try:
            llm, used_provider = build_chat_llm(request)
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))

        crew_llm = build_crew_llm(request)

        answer, used_web_search = process_query(
            request.query,
            request.context,
            request.noteTitle or "the document",
            llm,
            crew_llm,
            request.serper_api_key,
        )
        return ChatResponse(response=answer, used_web_search=used_web_search, llm_provider=used_provider)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")


if __name__ == "__main__":
    print(f"🚀 Starting AgentRAG Service on {RAG_SERVICE_HOST}:{RAG_SERVICE_PORT}")
    print(f"   Default Groq key:   {'✅' if DEFAULT_GROQ_API_KEY else '❌ (users must provide their own)'}")
    print(f"   Default Gemini key: {'✅' if DEFAULT_GEMINI_API_KEY else '❌ (users must provide their own)'}")
    print(f"   Default Serper key: {'✅' if DEFAULT_SERPER_API_KEY else '❌ (users must provide their own)'}")

    uvicorn.run(
        app,
        host=RAG_SERVICE_HOST,
        port=RAG_SERVICE_PORT,
        log_level="info"
    )