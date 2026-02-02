import { Metadata } from "./metadata";
import { Toaster } from "./ui/sonner";

interface ProviderProps {
  children: React.ReactNode;
}

export function Provider({ children }: ProviderProps) {
  return (
    <>
      <Metadata />
      {children}
      <Toaster />
    </>
  );
}
