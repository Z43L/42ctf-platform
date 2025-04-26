import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import StatCard from "@/components/dashboard/StatCard";
import ChallengeCard from "@/components/dashboard/ChallengeCard";
import TeamMemberCard from "@/components/dashboard/TeamMemberCard";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { data: user, isLoading: userLoading } = useQuery<any>({ queryKey: ["/api/auth/user"] });
  
  const { data: challenges, isLoading: challengesLoading } = useQuery<any[]>({ 
    queryKey: ["/api/challenges"] 
  });

  const { data: competition } = useQuery<any>({ 
    queryKey: ["/api/competitions/active"],
    enabled: false, // This endpoint isn't implemented yet
  });

  const { data: team, isLoading: teamLoading } = useQuery<any>({
    queryKey: [`/api/teams/${user?.teamId}`],
    enabled: !!user?.teamId,
  });

  const { data: teamMembers, isLoading: teamMembersLoading } = useQuery<any[]>({
    queryKey: [`/api/teams/${user?.teamId}/members`],
    enabled: !!user?.teamId,
  });
  
  // Obtener puntuación del usuario
  const { data: userScore } = useQuery<any>({
    queryKey: ["/api/scoreboard/user"],
    enabled: !!user,
  });
  
  // Obtener puntuación del equipo
  const { data: teamScore } = useQuery<any>({
    queryKey: [`/api/scoreboard/team/${user?.teamId}`],
    enabled: !!user?.teamId,
  });
  
  // Obtener clasificación de equipos
  const { data: teamRanking } = useQuery<any[]>({
    queryKey: ["/api/scoreboard/teams"],
    enabled: !!user?.teamId,
  });
  
  // Obtener estadísticas de retos completados
  const { data: submissionStats } = useQuery<any>({
    queryKey: ["/api/submissions/stats"],
    enabled: !!user,
  });

  // Calculate user stats based on real data
  const userPoints = userScore?.score || 0;
  const pointsGained = userScore?.pointsGained24h || 0;
  const teamPoints = teamScore?.score || 0;
  
  // Calculate team ranking
  const teamRank = team && teamRanking ? 
    teamRanking.findIndex(t => t.teamId === team.id) + 1 : 
    null;
  const totalTeams = teamRanking?.length || 0;
  
  // Calculate challenge stats
  const solvedChallenges = submissionStats?.solvedCount || 0;
  const totalChallenges = challenges?.length || 0;
  const remainingChallenges = totalChallenges - solvedChallenges;

  // Competition data
  const competitionActive = true; // Obtener de la API cuando esté disponible
  const competitionEndTime = new Date();
  competitionEndTime.setDate(competitionEndTime.getDate() + 3);

  const timeToEnd = formatDistanceToNow(competitionEndTime, { addSuffix: false });

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-text-secondary mt-1">Welcome back, your current progress</p>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="My Points"
          value={userPoints}
          subtitle={pointsGained > 0 ? `+${pointsGained} points since yesterday` : "No points gained today"}
          accentColor="text-accent-cyan"
        />

        <StatCard
          title="Team Rank"
          value={teamRank ? `${teamRank}${teamRank === 1 ? 'st' : teamRank === 2 ? 'nd' : teamRank === 3 ? 'rd' : 'th'}` : "N/A"}
          subtitle={team ? `Out of ${totalTeams} teams` : "Not in a team"}
          accentColor="text-accent-orange"
        />

        <StatCard
          title="Challenges Solved" 
          value={solvedChallenges}
          subtitle={`${remainingChallenges} challenges remaining`}
          accentColor="text-accent-green"
        />

        <StatCard
          title="Competition Status"
          value={
            <span className={`inline-block px-2 py-1 text-lg ${competitionActive ? 'bg-accent-green bg-opacity-20 text-accent-green' : 'bg-red-500 bg-opacity-20 text-red-500'} rounded`}>
              {competitionActive ? "Active" : "Inactive"}
            </span>
          }
          subtitle={competitionActive ? `Ends in ${timeToEnd}` : "No active competition"}
        />
      </div>

      {/* Challenges Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Active Challenges</h2>
          <Link href="/challenges">
            <Button variant="outline">View All Challenges</Button>
          </Link>
        </div>

        {challengesLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
          </div>
        ) : challenges && challenges.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {challenges.slice(0, 6).map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                id={challenge.id}
                title={challenge.title}
                description={challenge.description}
                points={challenge.points}
                categoryName={challenge.category.name}
                categoryColor={challenge.category.color}
                solved={challenge.solved}
                solves={challenge.solves}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-background-elevated rounded-lg border border-background-subtle">
            <p className="text-text-secondary">No challenges available yet.</p>
          </div>
        )}
      </div>

      {/* Team Section */}
      {user?.teamId ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Your Team: {team?.name || "Loading..."}</h2>
            <Link href={`/teams/${user.teamId}`}>
              <Button className="px-3 py-1.5 bg-accent-cyan text-background rounded-md text-sm hover:bg-opacity-90 transition-colors duration-150">
                Team Dashboard
              </Button>
            </Link>
          </div>

          <div className="bg-background-elevated rounded-lg border border-background-subtle p-6">
            <div className="flex flex-col md:flex-row md:items-center mb-6">
              <div className="flex-1 mb-4 md:mb-0">
                <h3 className="text-lg font-semibold mb-1">Team Progress</h3>
                <p className="text-text-secondary text-sm">
                  Currently with {teamPoints} points
                </p>
              </div>
              <div className="flex space-x-4">
                <div className="text-center">
                  <p className="text-accent-cyan text-2xl font-bold">{submissionStats?.teamSolvedCount || solvedChallenges}</p>
                  <p className="text-text-muted text-xs">Challenges<br/>Solved</p>
                </div>
                <div className="text-center">
                  <p className="text-accent-orange text-2xl font-bold">{teamMembers?.length || 0}</p>
                  <p className="text-text-muted text-xs">Team<br/>Members</p>
                </div>
                <div className="text-center">
                  <p className="text-accent-green text-2xl font-bold">{submissionStats?.firstBloods || 0}</p>
                  <p className="text-text-muted text-xs">First<br/>Bloods</p>
                </div>
              </div>
            </div>

            {/* Team Members */}
            <h4 className="font-medium text-sm text-text-secondary mb-3">TEAM MEMBERS</h4>
            {teamMembersLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-accent-cyan" />
              </div>
            ) : teamMembers && teamMembers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {teamMembers.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    username={member.username}
                    points={member.score || 0}
                    role={member.id === team?.captainId ? "Captain" : "Member"}
                    avatarColor={member.avatarColor}
                  />
                ))}
              </div>
            ) : (
              <p className="text-text-muted">No team members found.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-background-elevated rounded-lg border border-background-subtle p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">You are not in a team</h3>
          <p className="text-text-secondary mb-4">Join an existing team or create your own to collaborate with others.</p>
          <div className="flex justify-center space-x-4">
            <Link href="/teams">
              <Button variant="outline">Browse Teams</Button>
            </Link>
            <Link href="/teams/create">
              <Button>Create Team</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
