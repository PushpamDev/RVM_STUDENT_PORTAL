import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Bell, Home, Megaphone, Ticket, User } from "lucide-react";

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-muted/30">
      <MobileHeader title={title} />
      <main className="pb-20 pt-4 px-4 max-w-md mx-auto">{children}</main>
      <BottomNav />
    </div>
  );
}

function MobileHeader({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-background/70 bg-background/80 border-b">
      <div className="max-w-md mx-auto h-14 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/apple-touch-icon.png" alt="Logo" className="h-8 w-8 rounded-lg shadow-sm" />
          <div className="leading-tight">
            <p className="text-xs text-muted-foreground">Student Portal</p>
            <h1 className="text-sm font-semibold">{title ?? "Home"}</h1>
          </div>
        </div>
        <button aria-label="Notifications" className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-brand" />
        </button>
      </div>
    </header>
  );
}

function BottomNav() {
  const items = [
    { to: "/", label: "Home", icon: Home },
    { to: "/announcements", label: "Announcements", icon: Megaphone },
    { to: "/tickets", label: "Tickets", icon: Ticket },
    // New Job Portal Item
    { 
      to: "https://internal-job-portal.onrender.com/open-jobs", 
      label: "Jobs", 
      icon: User, // Using the User icon, or you can use 'Briefcase' from lucide-react
      external: true 
    },
  ];

  const location = useLocation();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Changed grid-cols-3 to grid-cols-4 */}
      <div className="max-w-md mx-auto grid grid-cols-4">
        {items.map(({ to, label, icon: Icon, external }) => {
          const active = location.pathname === to;
          const styles = cn(
            "flex flex-col items-center justify-center py-2.5 text-xs font-medium transition-colors",
            active ? "text-brand" : "text-muted-foreground hover:text-foreground"
          );

          // Render external anchor tag for the Job Portal
          if (external) {
            return (
              <a key={to} href={to} className={styles} target="_blank" rel="noopener noreferrer">
                <Icon className="h-5 w-5 mb-1" />
                {label}
              </a>
            );
          }

          // Render internal NavLink for everything else
          return (
            <NavLink key={to} to={to} className={styles}>
              <Icon className={cn("h-5 w-5 mb-1", active && "scale-110")} />
              {label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export default AppShell;