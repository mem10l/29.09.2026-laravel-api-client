import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

const AppContext = createContext(null);

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [notice, setNotice] = useState(null); // { message, isError }
  const noticeTimer = useRef();

  const notify = useCallback((message, isError = false) => {
    setNotice({ message, isError });
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 5000);
  }, []);

  const login = useCallback((data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const value = { user, login, logout, notify, notice };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
