import { createContext, useContext } from "react";

export const CashOutContext = createContext<() => void>(() => {});

export function useCashOut(): () => void {
  return useContext(CashOutContext);
}
