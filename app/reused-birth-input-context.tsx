"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ReusedBirthInput } from "../lib/saju/reused-birth-input";

type ReusedBirthInputContextValue = {
  reusedBirthInput: ReusedBirthInput | null;
  reuseBirthInput: (input: ReusedBirthInput) => void;
};

const ReusedBirthInputContext = createContext<ReusedBirthInputContextValue | null>(null);

export function ReusedBirthInputProvider({ children }: { children: ReactNode }) {
  const [reusedBirthInput, setReusedBirthInput] = useState<ReusedBirthInput | null>(null);
  const value = useMemo(
    () => ({
      reusedBirthInput,
      reuseBirthInput: (input: ReusedBirthInput) => setReusedBirthInput({ ...input }),
    }),
    [reusedBirthInput],
  );

  return (
    <ReusedBirthInputContext.Provider value={value}>
      {children}
    </ReusedBirthInputContext.Provider>
  );
}

export function useReusedBirthInput() {
  const value = useContext(ReusedBirthInputContext);
  if (!value) {
    throw new Error("useReusedBirthInput must be used inside ReusedBirthInputProvider");
  }
  return value;
}
