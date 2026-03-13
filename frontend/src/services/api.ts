import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Configure axios defaults
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Types
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

export interface User {
    _id: string;
    emailId: string;
    notes: string[];
}

export interface ChatMessage {
    query: string;
    response: string;
    sources?: Array<{ content: string; score: number }>;
    used_web_search?: boolean;
}

// User APIs
export const createUser = async (emailId: string, password: string) => {
    const response = await api.post('/user', { emailId, password });
    return response.data;
};

// Notes APIs
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
    const response = await api.post('/note', {
        userId,
        title,
        content,
        metaData,
    });
    return response.data;
};

export const uploadNoteFile = async (
    userId: string,
    title: string,
    file: File
) => {
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

export const updateNote = async (
    noteId: string,
    title?: string,
    content?: string
) => {
    const response = await api.put(`/note/${noteId}`, {
        title,
        content,
    });
    return response.data;
};

export const deleteNote = async (noteId: string, userId?: string) => {
    const response = await api.delete(`/note/${noteId}`, {
        data: { userId },
    });
    return response.data;
};

// Chat API
export const sendChatMessage = async (
    noteId: string,
    message: string,
    userId?: string
): Promise<ChatMessage> => {
    const response = await api.post(`/chat/${noteId}`, {
        message,
        userId,
    });
    return {
        query: message,
        response: response.data.response,
        sources: response.data.sources,
        used_web_search: response.data.used_web_search,
    };
};

// Error handler
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error.response?.data || error.message);
        throw error;
    }
);

export default api;
