import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import type { AuthResponse, User } from './types';

interface Notice {
  message: string;
  isError: boolean;
}

// Wraps an async event handler so any error it throws is caught and shown
// via notify(), instead of needing try/catch in every component.
type Guard = <Args extends unknown[]>(
  handler: (...args: Args) => Promise<void>,
) => (...args: Args) => Promise<void>;

interface AppContextValue {
  user: User | null;
  login: (data: AuthResponse) => void;
  logout: () => void;
  notify: (message: string, isError?: boolean) => void;
  notice: Notice | null;
  guard: Guard;
}

const AppContext = createContext<AppContextValue | null>(null);

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>();

  const notify = useCallback((message: string, isError = false) => {
    setNotice({ message, isError });
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 5000);
  }, []);

  const login = useCallback((data: AuthResponse) => {
    if (!data.token) return; // callers check this before calling login(), but stay safe here too
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const guard: Guard = useCallback((handler) => async (...args) => {
    try {
      await handler(...args);
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notify]);

  const value: AppContextValue = { user, login, logout, notify, notice, guard };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp() must be used inside <AppProvider>');
  return ctx;
}
