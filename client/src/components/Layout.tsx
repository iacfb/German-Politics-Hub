import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  Vote, 
  MessageSquareText, 
  Newspaper, 
  LayoutDashboard, 
  LogOut, 
  User,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/quizzes", label: "Quizzes", icon: Vote },
    { href: "/polls", label: "Meinungsbild", icon: Vote }, // "Opinion Poll" in German context
    { href: "/news", label: "Aktuelles", icon: Newspaper }, // "Current Events"
    { href: "/chat", label: "Politik AI", icon: MessageSquareText },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans">
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
           <div className="h-6 w-1 bg-gradient-to-b from-black via-[#DD0000] to-[#FFCC00] rounded-full" />
           <span className="font-display font-bold text-xl tracking-tight">BundesApp</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-b bg-card overflow-hidden"
          >
            <nav className="p-4 space-y-2">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="block">
                  <div 
                    className={clsx(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                      location === item.href 
                        ? "bg-primary text-primary-foreground font-medium shadow-md" 
                        : "hover:bg-accent/10 text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </div>
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card h-screen sticky top-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-8 w-1.5 bg-gradient-to-b from-black via-[#DD0000] to-[#FFCC00] rounded-full" />
            <span className="font-display font-bold text-2xl tracking-tight">BundesApp</span>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="block">
                <div 
                  className={clsx(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                    location === item.href 
                      ? "bg-primary text-primary-foreground font-medium shadow-lg shadow-primary/20" 
                      : "hover:bg-muted text-muted-foreground hover:text-foreground hover:translate-x-1"
                  )}
                >
                  <item.icon className={clsx("w-5 h-5", location === item.href ? "text-primary-foreground" : "group-hover:text-accent")} />
                  {item.label}
                </div>
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t bg-muted/20">
          {!isLoading && (
            <>
              {isAuthenticated ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border-2 border-background shadow-sm">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user?.firstName || 'User'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20"
                    onClick={() => logout()}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Log in to save results and vote.</p>
                  <Button asChild className="w-full">
                    <a href="/api/login">Login / Sign up</a>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-12">
          {children}
        </div>
      </main>
    </div>
  );
}
