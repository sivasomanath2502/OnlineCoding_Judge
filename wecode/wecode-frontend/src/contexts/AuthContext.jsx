import { createContext, useContext, useState, useEffect } from 'react';
import { api, BASE_URL } from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => sessionStorage.getItem('wecode_token'));
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const urlToken = urlParams.get('token');

            if (urlToken) {
                sessionStorage.setItem('wecode_token', urlToken);
                setToken(urlToken);
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            const currentToken = urlToken || sessionStorage.getItem('wecode_token');

            if (currentToken) {
                try {
                    const { data } = await api.get('/auth/me', {
                        headers: { Authorization: `Bearer ${currentToken}` }
                    });
                    setUser(data);
                } catch (err) {
                    console.error('Auth verification failed', err);
                    sessionStorage.removeItem('wecode_token');
                    setToken(null);
                    setUser(null);
                }
            } else {
                setToken(null);
                setUser(null);
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    const login = (redirectPath) => {
        if (redirectPath) {
            sessionStorage.setItem('wecode_redirect_after_login', redirectPath);
        }
        window.location.href = `/auth/google`;
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (err) {
            console.error('Logout error', err);
        } finally {
            sessionStorage.removeItem('wecode_token');
            setToken(null);
            setUser(null);
            window.location.href = '/';
        }
    };

    const isAdmin = () => user?.role === 'ROLE_ADMIN';
    const isLoggedIn = () => !!user;

    return (
        <AuthContext.Provider value={{ token, user, loading, login, logout, isAdmin, isLoggedIn }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);