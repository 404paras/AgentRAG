import { useState, useRef, useEffect } from "react"
import { useParams } from "react-router"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { SendHorizontal, ArrowLeft, Sparkles, Plus, MessageSquare, Trash2, Edit2, X, Menu, Info } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { 
  sendChatMessage, 
  getNote, 
  getChatSessions, 
  createChatSession, 
  deleteChatSession, 
  updateChatSession,
  getChatMessages,
  addChatMessage,
  type ChatSession,
  type ChatMessage as ChatMessageType
} from "../services/api"
import { getUserId } from "../utils/userStorage"
import { useToast } from "../components/ui/toast"
import { ConfirmModal } from "../components/ui/confirm-modal"
import "../styles/chat.css"

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Array<{ content: string; score: number }>;
}

function Chat() {
  const { noteId } = useParams<{noteId:string}>();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [noteTitle, setNoteTitle] = useState<string>('this note');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Session management
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Edit session title
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  
  // Delete confirmation
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; sessionId: string; title: string }>({
    isOpen: false,
    sessionId: '',
    title: ''
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Fetch note title and sessions on mount
  useEffect(() => {
    if (noteId) {
      getNote(noteId)
        .then(note => setNoteTitle(note.title))
        .catch(err => console.error('Error fetching note:', err));
      
      loadSessions();
    }
  }, [noteId]);

  // Focus edit input when editing
  useEffect(() => {
    if (editingSessionId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingSessionId]);

  const loadSessions = async () => {
    if (!noteId) return;
    
    try {
      setLoadingSessions(true);
      const fetchedSessions = await getChatSessions(noteId);
      setSessions(fetchedSessions);
      
      // If no sessions, create a new one
      if (fetchedSessions.length === 0) {
        await handleNewChat();
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const fetchedMessages = await getChatMessages(sessionId);
      const formattedMessages: Message[] = fetchedMessages.map((msg: ChatMessageType) => ({
        id: msg._id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.createdAt)
      }));
      setMessages(formattedMessages);
      setCurrentSessionId(sessionId);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load chat history');
    }
  };

  const handleNewChat = async () => {
    if (!noteId) return;

    // If the current session has no messages yet, don't create another empty one
    if (currentSessionId && messages.length === 0) {
      inputRef.current?.focus();
      return;
    }

    try {
      const newSession = await createChatSession(noteId);
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession._id);
      setMessages([]);
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create new chat');
    }
  };

  const handleSelectSession = (session: ChatSession) => {
    if (session._id === currentSessionId) return;
    loadSessionMessages(session._id);
  };

  const handleDeleteSession = async () => {
    const { sessionId } = deleteModal;
    
    try {
      await deleteChatSession(sessionId);
      setSessions(prev => prev.filter(s => s._id !== sessionId));
      
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
        
        // Load another session or create new one
        const remaining = sessions.filter(s => s._id !== sessionId);
        if (remaining.length > 0) {
          loadSessionMessages(remaining[0]._id);
        } else {
          handleNewChat();
        }
      }
      
      toast.success('Chat deleted');
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete chat');
    } finally {
      setDeleteModal({ isOpen: false, sessionId: '', title: '' });
    }
  };

  const handleEditSession = (session: ChatSession) => {
    setEditingSessionId(session._id);
    setEditTitle(session.title);
  };

  const handleSaveEdit = async () => {
    if (!editingSessionId || !editTitle.trim()) return;
    
    try {
      const updated = await updateChatSession(editingSessionId, editTitle.trim());
      setSessions(prev => prev.map(s => s._id === editingSessionId ? updated : s));
      setEditingSessionId(null);
      setEditTitle('');
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error('Failed to update chat title');
    }
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditTitle('');
  };

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
    if (!inputValue.trim() || !noteId || !currentSessionId) return;

    const userMessageContent = inputValue;
    setInputValue('');
    setIsTyping(true);

    // Add user message to UI immediately
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessageContent,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      // Save user message to database
      const savedUserMsg = await addChatMessage(currentSessionId, 'user', userMessageContent);
      
      // Update temp message with real ID
      setMessages(prev => prev.map(m => 
        m.id === tempUserMessage.id ? { ...m, id: savedUserMsg._id } : m
      ));

      // Get AI response
      const userId = getUserId();
      const response = await sendChatMessage(noteId, userMessageContent, userId);
      
      // Save assistant message to database
      const savedAssistantMsg = await addChatMessage(currentSessionId, 'assistant', response.response);
      
      const assistantMessage: Message = {
        id: savedAssistantMsg._id,
        role: 'assistant',
        content: response.response,
        timestamp: new Date(savedAssistantMsg.createdAt),
        sources: response.sources
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      // Update session in list (it will have new updatedAt)
      setSessions(prev => {
        const updated = prev.map(s => 
          s._id === currentSessionId 
            ? { ...s, updatedAt: new Date().toISOString(), title: s.title === 'New Chat' ? userMessageContent.substring(0, 50) : s.title }
            : s
        );
        // Move current session to top
        const currentSession = updated.find(s => s._id === currentSessionId);
        const others = updated.filter(s => s._id !== currentSessionId);
        return currentSession ? [currentSession, ...others] : updated;
      });

    } catch (error: any) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.response?.data?.message || error.message || 'Unknown error'}. Please try again.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatSessionDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="chat-page">
      {/* Sidebar */}
      <div className={`chat-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h3>Chat History</h3>
          <button className="new-chat-btn" onClick={handleNewChat}>
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>
        
        <div className="sidebar-info">
          <Info className="w-3 h-3" />
          <span>Last 20 chats saved</span>
        </div>

        <div className="sessions-list">
          {loadingSessions ? (
            <div className="sessions-loading">
              <div className="loading-spinner-sm"></div>
              <span>Loading...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="sessions-empty">
              <MessageSquare className="w-8 h-8" />
              <p>No chat history yet</p>
            </div>
          ) : (
            sessions.map(session => (
              <div 
                key={session._id}
                className={`session-item ${currentSessionId === session._id ? 'active' : ''}`}
              >
                {editingSessionId === session._id ? (
                  <div className="session-edit">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                      className="session-edit-input"
                    />
                    <button onClick={handleSaveEdit} className="session-edit-save">Save</button>
                    <button onClick={handleCancelEdit} className="session-edit-cancel">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div 
                      className="session-content"
                      onClick={() => handleSelectSession(session)}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <div className="session-info">
                        <span className="session-title">{session.title}</span>
                        <span className="session-date">{formatSessionDate(session.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="session-actions">
                      <button 
                        className="session-action-btn"
                        onClick={() => handleEditSession(session)}
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button 
                        className="session-action-btn delete"
                        onClick={() => setDeleteModal({ isOpen: true, sessionId: session._id, title: session.title })}
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-left">
            <button 
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <Button 
              variant="ghost" 
              className="back-button cursor-pointer"
              onClick={() => navigate('/notes')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
          <div className="chat-header-content">
            <h1 className="chat-title">Chat with {noteTitle}</h1>
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
              disabled={!currentSessionId}
            />
            <Button
              className="send-button cursor-pointer"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping || !currentSessionId}
            >
              <SendHorizontal className="w-5 h-5" />
            </Button>
          </div>
          <p className="chat-disclaimer">
            AI responses are generated based on your document content. Always verify important information.
          </p>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, sessionId: '', title: '' })}
        onConfirm={handleDeleteSession}
        title="Delete Chat"
        message={<>Are you sure you want to delete "<strong>{deleteModal.title}</strong>"? This will permanently remove all messages in this chat.</>}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}

export default Chat