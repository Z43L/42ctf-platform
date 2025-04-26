import { Link, useLocation } from "wouter";
import { useState, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { logout } from "@/lib/auth";
import UserAvatar from "@/components/ui/user-avatar";
import {
  Home,
  Flag,
  BarChart2,
  Users,
  User,
  LogOut,
  Menu,
  ShieldAlert,
  Terminal,
  X,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useMobile } from "@/hooks/use-mobile";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [location, setLocation] = useLocation();
  const { data: user } = useQuery<any>({ queryKey: ["/api/auth/user"] });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useMobile();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/login");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to log out. Please try again.",
      });
    }
  };

  const navItems = [
    { icon: <Home className="h-5 w-5 mr-3" />, label: "Dashboard", path: "/" },
    { icon: <Flag className="h-5 w-5 mr-3" />, label: "Challenges", path: "/challenges" },
    { icon: <BarChart2 className="h-5 w-5 mr-3" />, label: "Scoreboard", path: "/scoreboard" },
    { icon: <Users className="h-5 w-5 mr-3" />, label: "Teams", path: "/teams" },
  ];

  const adminItems = [
    { icon: <ShieldAlert className="h-5 w-5 mr-3" />, label: "Manage Challenges", path: "/admin/challenges" },
    { icon: <ShieldAlert className="h-5 w-5 mr-3" />, label: "Manage Teams", path: "/admin/teams" },
    { icon: <ShieldAlert className="h-5 w-5 mr-3" />, label: "Manage Users", path: "/admin/users" },
    { icon: <ShieldAlert className="h-5 w-5 mr-3" />, label: "Docker Manager", path: "/admin/docker" },
  ];

  const NavItem = ({ icon, label, path }: { icon: ReactNode; label: string; path: string }) => {
    const isActive = location === path;
    return (
      <li>
        <Link href={path}>
          <div
            className={`flex items-center px-6 py-3 ${
              isActive
                ? "text-accent-cyan bg-background-subtle font-medium"
                : "text-text-secondary hover:bg-background-subtle hover:text-text-primary transition duration-150"
            }`}
            onClick={() => setMobileMenuOpen(false)}
          >
            {icon}
            {label}
          </div>
        </Link>
      </li>
    );
  };

  const MobileHeader = () => (
    <div className="md:hidden fixed top-0 left-0 right-0 bg-background-elevated border-b border-background-subtle px-4 py-3 flex items-center justify-between z-10">
      <h1 className="text-xl font-bold flex items-center">
        <span className="text-accent-green mr-1">42</span>
        <span className="text-accent-cyan">CTF</span>
      </h1>
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6 text-text-secondary" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="bg-background-elevated border-r border-background-subtle p-0">
          <div className="p-6 mb-2 flex justify-between items-center">
            <h1 className="text-xl font-bold flex items-center">
              <span className="text-accent-green mr-2">42</span>
              <span className="text-accent-cyan">CTF</span>
            </h1>
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <nav className="flex-grow">
            <ul className="space-y-1">
              {navItems.map((item, index) => (
                <NavItem key={index} {...item} />
              ))}

              {user?.isAdmin && (
                <>
                  <li className="px-6 py-2">
                    <Separator className="bg-background-subtle" />
                    <p className="text-text-muted text-xs uppercase mt-2 mb-1">Admin</p>
                  </li>
                  {adminItems.map((item, index) => (
                    <NavItem key={`admin-${index}`} {...item} />
                  ))}
                </>
              )}
            </ul>
          </nav>
          
          <div className="p-4 border-t border-background-subtle mt-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <UserAvatar user={user} />
                <div className="ml-3">
                  <p className="text-sm font-medium">{user?.username}</p>
                  <p className="text-xs text-text-muted">
                    {user?.teamId ? "Team: ByteBreachers" : "No Team"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5 text-text-secondary" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background text-text-primary">
      {/* Sidebar for tablet and desktop */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col bg-background-elevated border-r border-background-subtle">
        <div className="p-6 mb-2">
          <h1 className="text-xl font-bold flex items-center">
            <span className="text-accent-green mr-2">42</span>
            <span className="text-accent-cyan">CTF</span>
          </h1>
        </div>
        
        <nav className="flex-grow">
          <ul className="space-y-1">
            {navItems.map((item, index) => (
              <NavItem key={index} {...item} />
            ))}

            {user?.isAdmin && (
              <>
                <li className="px-6 py-2">
                  <Separator className="bg-background-subtle" />
                  <p className="text-text-muted text-xs uppercase mt-2 mb-1">Admin</p>
                </li>
                {adminItems.map((item, index) => (
                  <NavItem key={`admin-${index}`} {...item} />
                ))}
              </>
            )}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-background-subtle">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <UserAvatar user={user} />
              <div className="ml-3">
                <Link href="/profile">
                  <div className="text-sm font-medium hover:text-accent-cyan transition-colors">
                    {user?.username}
                  </div>
                </Link>
                <p className="text-xs text-text-muted">
                  {user?.teamId ? "Team: ByteBreachers" : "No Team"}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5 text-text-secondary hover:text-text-primary" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      {isMobile && <MobileHeader />}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar pt-0 md:pt-0 pb-16 md:pb-0 mt-14 md:mt-0">
        {children}
      </main>
    </div>
  );
}
