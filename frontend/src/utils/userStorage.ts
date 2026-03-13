// Simple user storage using localStorage
// In production, this would use proper authentication

const USER_STORAGE_KEY = 'agentrag_user';

export interface StoredUser {
    _id: string;
    emailId: string;
}

export const saveUser = (user: StoredUser): void => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

export const getUser = (): StoredUser | null => {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (!stored) return null;
    try {
        return JSON.parse(stored);
    } catch {
        return null;
    }
};

export const clearUser = (): void => {
    localStorage.removeItem(USER_STORAGE_KEY);
};

export const getUserId = (): string => {
    const user = getUser();
    // For demo purposes, return a default user ID if not found
    return user?._id || 'demo-user-id';
};
