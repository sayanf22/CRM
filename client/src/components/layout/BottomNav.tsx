"use client"

import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Briefcase, CheckSquare, UserCog, IndianRupee } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useCurrentProfile } from "@/hooks/use-profiles";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  gradient: string;
  iconColor: string;
}

const glowVariants = {
  initial: { opacity: 0, scale: 0.8 },
  hover: {
    opacity: 1,
    scale: 1.5,
    transition: {
      opacity: { duration: 0.3 },
      scale: { duration: 0.3, type: "spring" as const, stiffness: 300, damping: 25 },
    },
  },
  active: {
    opacity: 1,
    scale: 1.2,
    transition: {
      opacity: { duration: 0.3 },
      scale: { duration: 0.3 },
    },
  },
};

export default function BottomNav() {
  const [location] = useLocation();
  const { data: currentProfile } = useCurrentProfile();
  const isAdmin = currentProfile?.role === 'admin';

  const navItems: NavItem[] = [
    { 
      path: "/", 
      label: "Home", 
      icon: <LayoutDashboard className="w-5 h-5" />,
      gradient: "radial-gradient(circle, rgba(59,130,246,0.2) 0%, rgba(37,99,235,0.08) 50%, transparent 100%)",
      iconColor: "text-blue-500"
    },
    { 
      path: "/leads", 
      label: "Leads", 
      icon: <Users className="w-5 h-5" />,
      gradient: "radial-gradient(circle, rgba(168,85,247,0.2) 0%, rgba(147,51,234,0.08) 50%, transparent 100%)",
      iconColor: "text-purple-500"
    },
    { 
      path: "/clients", 
      label: "Clients", 
      icon: <Briefcase className="w-5 h-5" />,
      gradient: "radial-gradient(circle, rgba(34,197,94,0.2) 0%, rgba(22,163,74,0.08) 50%, transparent 100%)",
      iconColor: "text-green-500"
    },
    { 
      path: "/tasks", 
      label: "Tasks", 
      icon: <CheckSquare className="w-5 h-5" />,
      gradient: "radial-gradient(circle, rgba(249,115,22,0.2) 0%, rgba(234,88,12,0.08) 50%, transparent 100%)",
      iconColor: "text-orange-500"
    },
    { 
      path: "/team", 
      label: "Team", 
      icon: <UserCog className="w-5 h-5" />,
      gradient: "radial-gradient(circle, rgba(236,72,153,0.2) 0%, rgba(219,39,119,0.08) 50%, transparent 100%)",
      iconColor: "text-pink-500"
    },
    ...(isAdmin ? [{ 
      path: "/financials", 
      label: "Finance", 
      icon: <IndianRupee className="w-5 h-5" />,
      gradient: "radial-gradient(circle, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.08) 50%, transparent 100%)",
      iconColor: "text-emerald-500"
    }] : []),
  ];

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <motion.nav 
        className="fixed bottom-4 left-4 right-4 z-50 sm:hidden"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="p-2 rounded-2xl bg-card/90 backdrop-blur-xl border border-border shadow-lg">
          <ul className="flex items-center justify-around gap-1">
            {navItems.map((item) => {
              const isActive = location === item.path;
              
              return (
                <motion.li key={item.path} className="relative flex-1">
                  <Link href={item.path}>
                    <motion.div
                      className="relative flex flex-col items-center justify-center py-2 px-1 rounded-xl overflow-visible cursor-pointer group"
                      whileHover="hover"
                      whileTap={{ scale: 0.95 }}
                      initial="initial"
                      animate={isActive ? "active" : "initial"}
                    >
                      {/* Glow Effect */}
                      <motion.div
                        className="absolute inset-0 z-0 pointer-events-none rounded-xl"
                        variants={glowVariants}
                        style={{
                          background: item.gradient,
                        }}
                      />
                      
                      {/* Icon */}
                      <motion.span 
                        className={cn(
                          "relative z-10 transition-colors duration-300",
                          isActive ? item.iconColor : "text-muted-foreground group-hover:text-foreground"
                        )}
                        animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        {item.icon}
                      </motion.span>
                      
                      {/* Label */}
                      <motion.span 
                        className={cn(
                          "relative z-10 text-[10px] mt-1 font-medium transition-colors duration-300",
                          isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                        )}
                      >
                        {item.label}
                      </motion.span>

                      {/* Active Indicator Dot */}
                      {isActive && (
                        <motion.div
                          className={cn("absolute -bottom-0.5 w-1 h-1 rounded-full", item.iconColor.replace("text-", "bg-"))}
                          layoutId="activeIndicator"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                    </motion.div>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </motion.nav>

      {/* Desktop Sidebar */}
      <nav className="hidden sm:flex fixed top-0 left-0 w-64 h-screen bg-card border-r border-border flex-col p-4 z-50">
        <div className="mb-8 px-4">
          <h1 className="text-xl font-bold font-display text-primary tracking-tight">Unity CRM</h1>
        </div>

        <div className="flex flex-col space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.path;

            return (
              <Link key={item.path} href={item.path}>
                <motion.div
                  className={cn(
                    "relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer group overflow-hidden",
                    isActive ? "bg-secondary" : "hover:bg-secondary/50"
                  )}
                  whileHover="hover"
                  whileTap={{ scale: 0.98 }}
                  initial="initial"
                >
                  {/* Glow Effect for Desktop */}
                  <motion.div
                    className="absolute inset-0 z-0 pointer-events-none"
                    variants={glowVariants}
                    style={{
                      background: item.gradient,
                    }}
                  />

                  {/* Active Indicator */}
                  {isActive && (
                    <motion.div
                      className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full", item.iconColor.replace("text-", "bg-"))}
                      layoutId="desktopActiveIndicator"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}

                  <motion.span 
                    className={cn(
                      "relative z-10 transition-colors duration-300",
                      isActive ? item.iconColor : "text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    {item.icon}
                  </motion.span>
                  
                  <span className={cn(
                    "relative z-10 text-sm font-medium transition-colors duration-300",
                    isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
