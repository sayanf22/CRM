import { ReactNode } from "react";
import BottomNav from "./BottomNav";

interface ShellProps {
  children: ReactNode;
}

export default function Shell({ children }: ShellProps) {
  return (
    <div className="flex flex-col sm:flex-row min-h-screen bg-background">
      <BottomNav />
      <main className="flex-1 pb-20 sm:pb-0 overflow-x-hidden">
        <div className="container mx-auto max-w-5xl p-4 sm:p-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
