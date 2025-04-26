import { Switch, Route, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Suspense, lazy, useEffect } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import AuthLayout from "@/components/layouts/AuthLayout";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Challenges from "@/pages/challenges";
import Challenge from "@/pages/challenge";
import Scoreboard from "@/pages/scoreboard";
import Teams from "@/pages/teams";
import Team from "@/pages/team";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";
import Duels from "@/pages/duels";
import DockerLab from "@/pages/docker-lab";
import TerminalInteractiveView from "@/pages/terminal-interactive";
import { Loader2 } from "lucide-react";

// Lazy load admin pages
const AdminChallenges = lazy(() => import("@/pages/admin/challenges"));
const AdminTeams = lazy(() => import("@/pages/admin/teams"));
const AdminUsers = lazy(() => import("@/pages/admin/users"));
const AdminDockerManager = lazy(() => import("@/pages/admin/docker-manager"));

function AuthenticatedRoutes() {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading, error } = useQuery<any>({ queryKey: ["/api/auth/user"] });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && error) {
      setLocation("/login");
    }
  }, [isLoading, error, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-accent-cyan" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/challenges" component={Challenges} />
        <Route path="/challenges/:id" component={Challenge} />
        <Route path="/duels" component={Duels} />
        <Route path="/docker-lab" component={DockerLab} />
        <Route path="/terminal" component={TerminalInteractiveView} />
        <Route path="/scoreboard" component={Scoreboard} />
        <Route path="/teams" component={Teams} />
        <Route path="/teams/:id" component={Team} />
        <Route path="/profile" component={Profile} />
        
        {/* Admin routes */}
        {user.isAdmin && (
          <Suspense fallback={<div className="p-8">Loading admin panel...</div>}>
            <Route path="/admin/challenges" component={AdminChallenges} />
            <Route path="/admin/teams" component={AdminTeams} />
            <Route path="/admin/users" component={AdminUsers} />
            <Route path="/admin/docker" component={AdminDockerManager} />
          </Suspense>
        )}
        
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function PublicRoutes() {
  return (
    <AuthLayout>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route component={Login} />
      </Switch>
    </AuthLayout>
  );
}

function App() {
  const { data: user, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-accent-cyan" />
      </div>
    );
  }

  // If user is authenticated, show authenticated routes, otherwise show public routes
  return user ? <AuthenticatedRoutes /> : <PublicRoutes />;
}

export default App;
