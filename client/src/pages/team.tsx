import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import TeamInfo from "@/components/teams/TeamInfo";
import { Loader2 } from "lucide-react";

export default function Team() {
  const { id } = useParams<{ id: string }>();
  const teamId = parseInt(id);

  const { data: user, isLoading: userLoading } = useQuery<any>({ 
    queryKey: ["/api/auth/user"] 
  });

  if (isNaN(teamId)) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-bold mb-4">Invalid Team ID</h2>
        <p className="text-text-secondary">The team ID provided is not valid.</p>
      </div>
    );
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
      </div>
    );
  }

  return <TeamInfo teamId={teamId} currentUser={user} />;
}
