import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Trophy } from "lucide-react";
import UserAvatar from "@/components/ui/user-avatar";
import { Link } from "wouter";

export default function Scoreboard() {
  const [activeTab, setActiveTab] = useState("teams");

  const { data: teamScoreboard, isLoading: teamsLoading } = useQuery<any[]>({ 
    queryKey: ["/api/scoreboard/teams"],
  });

  const { data: userScoreboard, isLoading: usersLoading } = useQuery<any[]>({ 
    queryKey: ["/api/scoreboard/users"],
  });

  const getTrophyColor = (position: number) => {
    switch (position) {
      case 1: return "text-yellow-400";
      case 2: return "text-gray-400";
      case 3: return "text-amber-700";
      default: return "text-text-muted";
    }
  };

  const renderTeamScoreboard = () => {
    if (teamsLoading) {
      return (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
        </div>
      );
    }

    if (!teamScoreboard || teamScoreboard.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-text-secondary">No team scores available yet.</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16 text-center">Rank</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="text-right">Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teamScoreboard.map((team, index) => (
            <TableRow key={team.teamId}>
              <TableCell className="text-center">
                {index < 3 ? (
                  <Trophy className={`h-5 w-5 inline-block ${getTrophyColor(index + 1)}`} />
                ) : (
                  <span className="text-text-secondary">{index + 1}</span>
                )}
              </TableCell>
              <TableCell>
                <Link href={`/teams/${team.teamId}`}>
                  <a className="font-medium hover:text-accent-cyan transition-colors">
                    {team.teamName}
                  </a>
                </Link>
              </TableCell>
              <TableCell className="text-right font-mono font-semibold text-accent-cyan">
                {team.score}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderUserScoreboard = () => {
    if (usersLoading) {
      return (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
        </div>
      );
    }

    if (!userScoreboard || userScoreboard.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-text-secondary">No user scores available yet.</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16 text-center">Rank</TableHead>
            <TableHead>User</TableHead>
            <TableHead className="text-right">Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {userScoreboard.map((user, index) => (
            <TableRow key={user.userId}>
              <TableCell className="text-center">
                {index < 3 ? (
                  <Trophy className={`h-5 w-5 inline-block ${getTrophyColor(index + 1)}`} />
                ) : (
                  <span className="text-text-secondary">{index + 1}</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <UserAvatar
                    user={{ username: user.username }}
                    size="sm"
                  />
                  <span className="ml-2 font-medium">{user.username}</span>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono font-semibold text-accent-cyan">
                {user.score}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Scoreboard</h1>
        <p className="text-text-secondary mt-1">Current rankings based on challenge completions</p>
      </header>

      <Card>
        <CardContent className="pt-6">
          <Tabs
            defaultValue="teams"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="mb-6">
              <TabsTrigger value="teams">Team Rankings</TabsTrigger>
              <TabsTrigger value="users">Individual Rankings</TabsTrigger>
            </TabsList>
            <TabsContent value="teams">
              {renderTeamScoreboard()}
            </TabsContent>
            <TabsContent value="users">
              {renderUserScoreboard()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
