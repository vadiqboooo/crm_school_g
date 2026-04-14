import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

interface HeaderActionsContextValue {
  headerActions: ReactNode;
  setHeaderActions: (actions: ReactNode) => void;
  mobileHeaderHidden: boolean;
  setMobileHeaderHidden: (hidden: boolean) => void;
}

const HeaderActionsContext = createContext<HeaderActionsContextValue>({
  headerActions: null,
  setHeaderActions: () => {},
  mobileHeaderHidden: false,
  setMobileHeaderHidden: () => {},
});

export function HeaderActionsProvider({ children }: { children: ReactNode }) {
  const [headerActions, setHeaderActionsState] = useState<ReactNode>(null);
  const [mobileHeaderHidden, setMobileHeaderHiddenState] = useState(false);
  const setHeaderActions = useCallback((actions: ReactNode) => {
    setHeaderActionsState(actions);
  }, []);
  const setMobileHeaderHidden = useCallback((hidden: boolean) => {
    setMobileHeaderHiddenState(hidden);
  }, []);

  return (
    <HeaderActionsContext.Provider value={{ headerActions, setHeaderActions, mobileHeaderHidden, setMobileHeaderHidden }}>
      {children}
    </HeaderActionsContext.Provider>
  );
}

export function useHeaderActions() {
  return useContext(HeaderActionsContext);
}
