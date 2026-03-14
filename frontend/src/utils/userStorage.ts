const USER_KEY = 'docpal_user';
const TOKEN_KEY = 'docpal_token';

export interface StoredUser {
    _id: string;
    emailId: string;
}

export const saveUser = (user: StoredUser): void => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = (): StoredUser | null => {
    const stored = localStorage.getItem(USER_KEY);
    if (!stored) return null;
    try {
        return JSON.parse(stored);
    } catch {
        return null;
    }
};

export const clearUser = (): void => {
    localStorage.removeItem(USER_KEY);
};

export const getUserId = (): string => {
    const user = getUser();
    return user?._id || '';
};

export const saveToken = (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
};

export const getToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
};

export const clearToken = (): void => {
    localStorage.removeItem(TOKEN_KEY);
};

export const clearAll = (): void => {
    clearUser();
    clearToken();
};