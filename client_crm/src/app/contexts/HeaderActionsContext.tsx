import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

interface HeaderActionsContextValue {
  headerActions: ReactNode;
  setHeaderActions: (actions: ReactNode) => void;
}

const HeaderActionsContext = createContext<HeaderActionsContextValue>({
  headerActions: null,
  setHeaderActions: () => {},
});

export function HeaderActionsProvider({ children }: { children: ReactNode }) {
  const [headerActions, setHeaderActionsState] = useState<ReactNode>(null);
  const setHeaderActions = useCallback((actions: ReactNode) => {
    setHeaderActionsState(actions);
  }, []);

  return (
    <HeaderActionsContext.Provider value={{ headerActions, setHeaderActions }}>
      {children}
    </HeaderActionsContext.Provider>
  );
}

export function useHeaderActions() {
  return useContext(HeaderActionsContext);
}
