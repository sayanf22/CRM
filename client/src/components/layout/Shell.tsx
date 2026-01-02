import { ReactNode } from "react";
import BottomNav from "./BottomNav";
import HamburgerMenu from "./HamburgerMenu";

interface ShellProps {
  children: ReactNode;
}

export default function Shell({ children }: ShellProps) {
  return (
    <div className="flex flex-col sm:flex-row min-h-screen bg-background">
      <BottomNav />
      <main className="flex-1 pb-24 sm:pb-0 sm:ml-64 overflow-x-hidden">
        <div className="container mx-auto max-w-5xl p-4 sm:p-8 animate-in fade-in duration-500">
          <div className="flex items-center justify-between mb-4 sm:hidden">
            <h1 className="text-xl font-bold font-display text-primary">Unity CRM</h1>
            <HamburgerMenu />
          </div>
          <div className="hidden sm:flex sm:justify-end sm:mb-4">
            <HamburgerMenu />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
