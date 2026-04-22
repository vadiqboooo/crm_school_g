import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { api } from "../lib/api";
import { storage } from "../lib/storage";

export interface AuthUser {
  id: string;
  first_name: string;
  last_name: string;
  role: "student" | "app_user";
  student_id?: string | null;
}

interface AuthCtx {
  ready: boolean;
  user: AuthUser | null;
  signIn: (login: string, password: string) => Promise<void>;
  signInFromStorage: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

async function readStoredUser(): Promise<AuthUser | null> {
  const raw = await storage.getItem("s_student");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    (async () => {
      await api.load();
      if (api.isAuthenticated()) {
        const stored = await readStoredUser();
        if (stored) setUser(stored);
      }
      setReady(true);
    })();
  }, []);

  const signIn = useCallback(async (login: string, password: string) => {
    const data = await api.login(login, password);
    setUser({
      id: data.student_id,
      first_name: data.first_name,
      last_name: data.last_name,
      role: data.role,
      student_id: data.linked_student_id,
    });
  }, []);

  // После успешного email-флоу api.ts уже сохранил токены + s_student — берём его и кидаем в state
  const signInFromStorage = useCallback(async () => {
    const stored = await readStoredUser();
    if (stored) setUser(stored);
  }, []);

  const signOut = useCallback(async () => {
    await api.clearTokens();
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ ready, user, signIn, signInFromStorage, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
