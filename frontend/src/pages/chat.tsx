import { useState, useRef, useEffect } from "react"
import { useParams } from "react-router"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { SendHorizontal, ArrowLeft, Sparkles } from "lucide-react"
import { useNavigate } from "react-router-dom"
import "../styles/chat.css"

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function Chat() {
  const { noteId } = useParams<{noteId:string}>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `This is a simulated response to: "${userMessage.content}". In a real implementation, this would connect to your RAG backend to query the note (ID: ${noteId}) and provide intelligent answers based on the document content.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 3000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <Button 
          variant="ghost" 
          className="back-button cursor-pointer"
          onClick={() => navigate('/notes')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="chat-header-content">
          <h1 className="chat-title">Chat with Note {noteId}</h1>
          <p className="chat-subtitle">Ask questions about your document</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <Sparkles className="empty-icon" />
            <h2 className="empty-title">Start a conversation</h2>
            <p className="empty-subtitle">
              Ask questions about your document and get AI-powered answers
            </p>
            <div className="suggested-prompts">
              <button 
                className="prompt-chip"
                onClick={() => setInputValue("What is this document about?")}
              >
                What is this document about?
              </button>
              <button 
                className="prompt-chip"
                onClick={() => setInputValue("Summarize the key points")}
              >
                Summarize the key points
              </button>
              <button 
                className="prompt-chip"
                onClick={() => setInputValue("What are the main topics discussed?")}
              >
                What are the main topics discussed?
              </button>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`message ${message.role === 'user' ? 'message-user' : 'message-assistant'}`}
              >
                <div className="message-avatar">
                  {message.role === 'user' ? (
                    <div className="avatar-user">You</div>
                  ) : (
                    <div className="avatar-assistant">AI</div>
                  )}
                </div>
                <div className="message-content">
                  <div className="message-text">{message.content}</div>
                  <div className="message-timestamp">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="message message-assistant">
                <div className="message-avatar">
                  <div className="avatar-assistant">AI</div>
                </div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <Input
            ref={inputRef}
            className="chat-input"
            placeholder="Type your message here..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <Button
            className="send-button cursor-pointer"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
          >
            <SendHorizontal className="w-5 h-5" />
          </Button>
        </div>
        <p className="chat-disclaimer">
          AI responses are generated based on your document content. Always verify important information.
        </p>
      </div>
    </div>
  )
}

export default Chat