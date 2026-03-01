import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Leaf, LogOut, BarChart3, UtensilsCrossed, HandHeart, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS: Record<AppRole, { label: string; path: string; icon: React.ReactNode }[]> = {
  restaurant: [
    { label: "Dashboard", path: "/dashboard", icon: <UtensilsCrossed className="h-4 w-4" /> },
    { label: "Impact", path: "/impact", icon: <BarChart3 className="h-4 w-4" /> },
  ],
  ngo: [
    { label: "Dashboard", path: "/dashboard", icon: <HandHeart className="h-4 w-4" /> },
    { label: "Impact", path: "/impact", icon: <BarChart3 className="h-4 w-4" /> },
  ],
  volunteer: [
    { label: "Dashboard", path: "/dashboard", icon: <Truck className="h-4 w-4" /> },
    { label: "Impact", path: "/impact", icon: <BarChart3 className="h-4 w-4" /> },
  ],
};

const THEME_CLASS: Record<AppRole, string> = {
  restaurant: "theme-restaurant",
  ngo: "theme-ngo",
  volunteer: "theme-volunteer",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role, signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const navItems = role ? NAV_ITEMS[role] : [];
  const themeClass = role ? THEME_CLASS[role] : "";

  return (
    <div className={cn("min-h-screen bg-background", themeClass)}>
      <header className="sticky top-0 z-50 border-b bg-role-header-bg text-role-header-fg shadow-sm">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Leaf className="h-5 w-5" />
            <span className="font-bold text-lg">FoodLink AI</span>
            {role && (
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium capitalize">
                {role}
              </span>
            )}
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={location.pathname === item.path ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-1.5",
                    location.pathname === item.path
                      ? "bg-white/20 text-role-header-fg hover:bg-white/25"
                      : "text-role-header-fg/80 hover:bg-white/10 hover:text-role-header-fg"
                  )}
                >
                  {item.icon}
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              </Link>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-1.5 text-role-header-fg/70 hover:bg-white/10 hover:text-role-header-fg"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </nav>
        </div>
      </header>
      <main className="container py-6">{children}</main>
    </div>
  );
}
