import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/auth/me').then(({ data }) => setUser(data.user)).catch(() => setUser(null)).finally(() => setLoading(false));
    }, []);

    const value = useMemo(() => ({
        user,
        loading,
        async login(email, password) {
            const { data } = await api.post('/auth/login', { email, password });
            setUser(data.user);
            return data.user;
        },
        async logout() {
            await api.post('/auth/logout');
            setUser(null);
        }
    }), [loading, user]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used inside AuthProvider.');
    return context;
}
