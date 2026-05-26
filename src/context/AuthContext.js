import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch, setToken, clearToken, getToken } from "../lib/api";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    apiFetch("/api/auth/me")
      .then(({ user }) => { setUser(user); setProfile(user); })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const signUp = async (email, password, full_name) => {
    const { token, user } = await apiFetch("/api/auth/signup", {
      method: "POST", body: { email, password, full_name },
    });
    setToken(token); setUser(user); setProfile(user);
    return { data: { user }, error: null };
  };

  const signIn = async (email, password) => {
    const { token, user } = await apiFetch("/api/auth/signin", {
      method: "POST", body: { email, password },
    });
    setToken(token); setUser(user); setProfile(user);
    return { data: { user }, error: null };
  };

  const signOut = () => {
    clearToken(); setUser(null); setProfile(null);
  };

  const updateProfile = async (updates) => {
    const { user } = await apiFetch("/api/auth/update-profile", {
      method: "PATCH", body: updates,
    });
    setProfile(user);
    return user;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
