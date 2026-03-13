from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.tools import SerperDevTool
from crewai_tools import ScrapeWebsiteTool
from crewai import Agent, Task, Crew, LLM
import uvicorn

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="AgentRAG Service", version="1.0.0")

# Environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SERPER_API_KEY = os.getenv("SERPER_API_KEY")
RAG_SERVICE_PORT = int(os.getenv("RAG_SERVICE_PORT", "8000"))
RAG_SERVICE_HOST = os.getenv("RAG_SERVICE_HOST", "0.0.0.0")

# Initialize LLMs
groq_llm = ChatGroq(
    api_key=GROQ_API_KEY,
    model="llama-3.3-70b-versatile",
    temperature=0.7
) if GROQ_API_KEY else None

gemini_llm = LLM(
    model="gemini/gemini-2.0-flash-exp",
    api_key=GEMINI_API_KEY,
    temperature=0.7
) if GEMINI_API_KEY else None

# Request/Response models
class ChatRequest(BaseModel):
    query: str
    context: str
    noteTitle: Optional[str] = "the document"

class ChatResponse(BaseModel):
    response: str
    used_web_search: bool = False

# Helper functions
def check_local_knowledge(query: str, context: str) -> bool:
    """
    Determine if the local context is sufficient to answer the query
    """
    if not groq_llm:
        return True  # Default to local if Groq unavailable
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a decision-making assistant. Your task is to determine if the provided context 
        contains enough information to answer the user's question.
        
        Respond with ONLY ONE WORD: 'Yes' or 'No'.
        - Answer 'Yes' if the context is sufficient
        - Answer 'No' if the context is insufficient or the question requires external information"""),
        ("human", f"Context: {context}\n\nQuestion: {query}\n\nCan this context answer the question?")
    ])
    
    try:
        chain = prompt | groq_llm
        result = chain.invoke({})
        answer = result.content.strip().lower()
        return answer == "yes"
    except Exception as e:
        print(f"Error in check_local_knowledge: {e}")
        return True  # Default to local on error

def setup_web_scraping_agent():
    """
    Set up CrewAI agents for web search and scraping
    """
    if not gemini_llm or not SERPER_API_KEY:
        return None
    
    # Tools
    serper_tool = SerperDevTool()
    scraper_tool = ScrapeWebsiteTool()
    
    # Search Agent
    search_agent = Agent(
        role="Web Researcher",
        goal="Find the most relevant web page for the given topic",
        backstory="You are an expert at finding high-quality, relevant information on the internet.",
        tools=[serper_tool],
        llm=gemini_llm,
        verbose=True
    )
    
    # Scraper Agent
    scraper_agent = Agent(
        role="Content Extractor",
        goal="Extract and summarize relevant information from web pages",
        backstory="You are skilled at reading web content and extracting key information.",
        tools=[scraper_tool],
        llm=gemini_llm,
        verbose=True
    )
    
    return search_agent, scraper_agent

def get_web_content(query: str) -> str:
    """
    Use CrewAI to search the web and scrape relevant content
    """
    try:
        agents = setup_web_scraping_agent()
        if not agents:
            return ""
        
        search_agent, scraper_agent = agents
        
        # Define tasks
        search_task = Task(
            description=f"Search the web for: {query}. Return the URL of the best result.",
            expected_output="A single URL of the most relevant webpage",
            agent=search_agent
        )
        
        scrape_task = Task(
            description="Scrape and summarize the content from the URL found in the previous task",
            expected_output="A concise summary of the webpage content",
            agent=scraper_agent
        )
        
        # Create and run crew
        crew = Crew(
            agents=[search_agent, scraper_agent],
            tasks=[search_task, scrape_task],
            verbose=True
        )
        
        result = crew.kickoff()
        return str(result)
    except Exception as e:
        print(f"Error in get_web_content: {e}")
        return ""

def generate_final_answer(context: str, query: str, note_title: str) -> str:
    """
    Generate a natural language answer using the context
    """
    if not groq_llm:
        return f"Based on {note_title}: {context[:500]}..."
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", f"""You are a helpful AI assistant answering questions about "{note_title}".
        Use the provided context to give accurate, detailed answers.
        If the context doesn't contain the answer, say so politely."""),
        ("human", f"Context:\n{context}\n\nQuestion: {query}\n\nAnswer:")
    ])
    
    try:
        chain = prompt | groq_llm
        result = chain.invoke({})
        return result.content
    except Exception as e:
        print(f"Error generating answer: {e}")
        return f"I found this information in {note_title}: {context[:500]}..."

# API Endpoints
@app.get("/")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "AgentRAG",
        "groq_available": groq_llm is not None,
        "gemini_available": gemini_llm is not None
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Process a chat message with RAG
    """
    try:
        # Check if local context is sufficient
        use_local = check_local_knowledge(request.query, request.context)
        
        if use_local:
            # Use local context
            answer = generate_final_answer(
                request.context,
                request.query,
                request.noteTitle
            )
            return ChatResponse(response=answer, used_web_search=False)
        else:
            # Need to search the web
            web_context = get_web_content(request.query)
            
            if web_context:
                # Combine local and web context
                combined_context = f"Local Context:\n{request.context}\n\nWeb Context:\n{web_context}"
                answer = generate_final_answer(
                    combined_context,
                    request.query,
                    request.noteTitle
                )
                return ChatResponse(response=answer, used_web_search=True)
            else:
                # Fallback to local context if web search fails
                answer = generate_final_answer(
                    request.context,
                    request.query,
                    request.noteTitle
                )
                return ChatResponse(response=answer, used_web_search=False)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")

if __name__ == "__main__":
    print(f"🚀 Starting AgentRAG Service on {RAG_SERVICE_HOST}:{RAG_SERVICE_PORT}")
    print(f"   Groq LLM: {'✅' if groq_llm else '❌'}")
    print(f"   Gemini LLM: {'✅' if gemini_llm else '❌'}")
    print(f"   Serper API: {'✅' if SERPER_API_KEY else '❌'}")
    
    uvicorn.run(
        app,
        host=RAG_SERVICE_HOST,
        port=RAG_SERVICE_PORT,
        log_level="info"
    )
