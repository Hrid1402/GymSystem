import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';
import { setTokenCookie, getTokenCookie, removeTokenCookie } from '../utils/cookies';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => getTokenCookie());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const activeToken = getTokenCookie();
      if (!activeToken) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      try {
        const response = await authApi.getMe();
        if (response?.user) {
          setUser(response.user);
          localStorage.setItem('user', JSON.stringify(response.user));
        }
      } catch (err) {
        removeTokenCookie();
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email, password) => {
    const response = await authApi.login({ email, password });
    if (response?.access_token) {
      setTokenCookie(response.access_token);
      setToken(response.access_token);
    }
    if (response?.user) {
      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response.user;
  };

  const logout = () => {
    removeTokenCookie();
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
