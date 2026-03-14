import axios from 'axios';
import { getToken, clearAll } from '../utils/userStorage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const requestUrl: string = error.config?.url ?? '';
        const isAuthEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/user');

        if (error.response?.status === 401 && !isAuthEndpoint) {
            clearAll();
            window.location.href = '/login';
        }

        throw error;
    }
);

export interface Note {
    _id: string;
    title: string;
    content: string;
    metaData: {
        filePages: number;
        fileSize: string;
        fileType: 'pdf' | 'docx' | 'doc' | 'txt';
        uploadedOn: string;
        textLength: number;
    };
}

// Chat Session Types
export interface ChatSession {
    _id: string;
    noteId: string;
    userId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}

export interface ChatMessage {
    _id: string;
    sessionId: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
}

// API Keys Types
export interface ApiKeysResponse {
    pinecone: string | null;
    pineconeIndex: string | null;
    groq: string | null;
    gemini: string | null;
    serper: string | null;
    hasPinecone: boolean;
    hasGroq: boolean;
    hasGemini: boolean;
    hasSerper: boolean;
    // Whether the server .env already has these keys
    serverHasGroq: boolean;
    serverHasGemini: boolean;
    serverHasSerper: boolean;
}

// ==================== AUTH ====================

export const registerUser = async (emailId: string, password: string) => {
    const response = await api.post('/user', { emailId, password });
    return response.data;
};

export const loginUser = async (emailId: string, password: string) => {
    const response = await api.post('/auth/login', { emailId, password });
    return response.data;
};

// ==================== NOTES ====================

export const getNotes = async (userId: string): Promise<Note[]> => {
    const response = await api.get(`/notes/${userId}`);
    return response.data.notes;
};

export const getNote = async (noteId: string): Promise<Note> => {
    const response = await api.get(`/note/${noteId}`);
    return response.data.note;
};

export const createNote = async (
    userId: string,
    title: string,
    content: string,
    metaData?: any
) => {
    const response = await api.post('/note', { userId, title, content, metaData });
    return response.data;
};

export const uploadNoteFile = async (userId: string, title: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('title', title);

    const response = await api.post('/note/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const updateNote = async (noteId: string, title?: string, content?: string) => {
    const response = await api.put(`/note/${noteId}`, { title, content });
    return response.data;
};

export const deleteNote = async (noteId: string, userId?: string) => {
    const response = await api.delete(`/note/${noteId}`, { data: { userId } });
    return response.data;
};

// ==================== CHAT ====================

export interface ChatResponse {
    query: string;
    response: string;
    sources?: Array<{ content: string; score: number }>;
    used_web_search?: boolean;
}

export const sendChatMessage = async (
    noteId: string,
    message: string,
    userId?: string
): Promise<ChatResponse> => {
    const response = await api.post(`/chat/${noteId}`, { message, userId });
    return {
        query: message,
        response: response.data.response,
        sources: response.data.sources,
        used_web_search: response.data.used_web_search,
    };
};

// ==================== API KEYS ====================

export const saveApiKeys = async (
    userId: string,
    options: {
        pineconeKey?: string;
        pineconeIndex?: string;
        groqKey?: string;
        geminiKey?: string;
        serperKey?: string;
    }
) => {
    const response = await api.post('/user/api-keys', { userId, ...options });
    return response.data;
};

export const getApiKeys = async (userId: string): Promise<{ apiKeys: ApiKeysResponse; hasApiKeys: boolean }> => {
    const response = await api.get(`/user/api-keys/${userId}`);
    return response.data;
};

export const deleteApiKeys = async (userId: string) => {
    const response = await api.delete(`/user/api-keys/${userId}`);
    return response.data;
};

// ==================== CHAT SESSIONS ====================

export const getChatSessions = async (noteId: string): Promise<ChatSession[]> => {
    const response = await api.get(`/chat-sessions/${noteId}`);
    return response.data.sessions;
};

export const createChatSession = async (noteId: string, title?: string): Promise<ChatSession> => {
    const response = await api.post('/chat-sessions', { noteId, title });
    return response.data.session;
};

export const updateChatSession = async (sessionId: string, title: string): Promise<ChatSession> => {
    const response = await api.put(`/chat-sessions/${sessionId}`, { title });
    return response.data.session;
};

export const deleteChatSession = async (sessionId: string) => {
    const response = await api.delete(`/chat-sessions/${sessionId}`);
    return response.data;
};

// ==================== CHAT MESSAGES ====================

export const getChatMessages = async (sessionId: string): Promise<ChatMessage[]> => {
    const response = await api.get(`/chat-messages/${sessionId}`);
    return response.data.messages;
};

export const addChatMessage = async (
    sessionId: string,
    role: 'user' | 'assistant',
    content: string
): Promise<ChatMessage> => {
    const response = await api.post('/chat-messages', { sessionId, role, content });
    return response.data.message;
};

export default api;