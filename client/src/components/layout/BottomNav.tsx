import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Briefcase, CheckSquare, UserCog } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/leads", label: "Leads", icon: Users },
    { path: "/clients", label: "Clients", icon: Briefcase },
    { path: "/tasks", label: "Tasks", icon: CheckSquare },
    { path: "/team", label: "Team", icon: UserCog },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe z-50 h-16 sm:h-auto sm:sticky sm:top-0 sm:left-0 sm:w-64 sm:h-screen sm:border-r sm:border-t-0 flex sm:flex-col sm:justify-start sm:p-4">
      
      <div className="hidden sm:block mb-8 px-4">
        <h1 className="text-xl font-bold font-display text-primary tracking-tight">Unity CRM</h1>
      </div>

      <div className="flex sm:flex-col justify-around sm:justify-start items-center sm:items-stretch w-full h-full sm:h-auto sm:space-y-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;

          return (
            <Link key={item.path} href={item.path}>
              <span className={cn(
                "relative flex flex-col sm:flex-row items-center sm:justify-start justify-center flex-1 sm:flex-none h-full sm:h-12 py-2 sm:py-0 sm:px-4 text-xs sm:text-sm font-medium transition-colors duration-200 select-none cursor-pointer rounded-md",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-[1px] sm:top-0 sm:left-0 sm:w-[2px] sm:h-full sm:bg-primary left-0 right-0 h-[2px] bg-primary sm:rounded-none rounded-full mx-auto w-12 sm:w-auto"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className={cn("w-5 h-5 mb-1 sm:mb-0 sm:mr-3", isActive && "stroke-[2.5px]")} />
                <span className={cn(isActive && "font-semibold")}>{item.label}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
