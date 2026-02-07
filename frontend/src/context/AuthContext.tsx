import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import { getToken, removeToken, setToken, setRefreshToken, removeRefreshToken } from '@/lib/utils';

interface User {
    id: string;
    email: string;
    is_active: boolean;
    is_superuser: boolean;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (token: string, refreshToken: string) => void;
    logout: () => void;
    fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUser = async () => {
        try {
            const response = await api.get('/users/me');
            setUser(response.data);
        } catch (error) {
            console.error('Failed to fetch user', error);
            logout();
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const token = getToken();
        if (token) {
            fetchUser();
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = (token: string, refreshToken: string) => {
        setToken(token);
        setRefreshToken(refreshToken);
        fetchUser();
    };

    const logout = () => {
        removeToken();
        removeRefreshToken();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, fetchUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
