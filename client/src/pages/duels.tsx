import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import MainLayout from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Trophy, Award, Users, Clock, Play, Ban, Terminal } from "lucide-react";
import WebTerminal from "@/components/terminal/WebTerminal";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

interface DuelStats {
  userId: number;
  duelWins: number;
  duelLosses: number;
  duelRating: number;
  duelLastPlayed: string | null;
}

interface LeaderboardEntry {
  userId: number;
  username: string;
  rating: number;
  wins: number;
  losses: number;
}

interface QueueStatus {
  inQueue: boolean;
  activeMatch: DuelMatch | null;
}

interface DuelChallenge {
  id: number;
  challengerId: number;
  challengedId: number;
  status: string;
  createdAt: string;
  expiresAt: string;
}

interface DuelMatch {
  id: number;
  player1Id: number;
  player2Id: number;
  status: string;
  startedAt: string;
  endedAt: string | null;
  winnerId: number | null;
  containerData: {
    player1Container: string;
    player2Container: string;
    networkId: string;
    player1Ip: string;
    player2Ip: string;
  } | null;
  scoreChange: number | null;
  logs: string;
}

function getStatusColor(status: string) {
  switch(status) {
    case "pending": return "bg-yellow-500";
    case "accepted": return "bg-green-500";
    case "rejected": return "bg-red-500";
    case "expired": return "bg-gray-500";
    case "preparing": return "bg-blue-500";
    case "in_progress": return "bg-purple-500";
    case "player1_victory": 
    case "player2_victory": return "bg-green-500";
    case "draw": return "bg-orange-500";
    case "cancelled": return "bg-red-500";
    default: return "bg-gray-500";
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  return date.toLocaleString();
}

function DuelsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("queue");
  
  // Estado para la sesión de terminal activa
  const [activeTerminalSession, setActiveTerminalSession] = useState<{
    sessionId: number;
    token: string;
    matchId: number;
  } | null>(null);
  
  // Obtener estadísticas de duelo
  const { 
    data: stats, 
    isLoading: statsLoading 
  } = useQuery({
    queryKey: ["/api/duels/stats"],
    queryFn: async () => {
      const res = await fetch("/api/duels/stats");
      if (!res.ok) throw new Error("Failed to fetch duel stats");
      return res.json();
    }
  });
  
  // Obtener clasificación
  const { 
    data: leaderboard, 
    isLoading: leaderboardLoading 
  } = useQuery({
    queryKey: ["/api/duels/leaderboard"],
    queryFn: async () => {
      const res = await fetch("/api/duels/leaderboard");
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    }
  });
  
  // Obtener estado de la cola
  const { 
    data: queueStatus, 
    isLoading: queueStatusLoading,
    refetch: refetchQueueStatus
  } = useQuery({
    queryKey: ["/api/duels/queue/status"],
    queryFn: async () => {
      const res = await fetch("/api/duels/queue/status");
      if (!res.ok) throw new Error("Failed to fetch queue status");
      return res.json();
    },
    refetchInterval: 5000 // Auto-refetch cada 5 segundos
  });
  
  // Obtener desafíos
  const { 
    data: challenges, 
    isLoading: challengesLoading,
    refetch: refetchChallenges
  } = useQuery({
    queryKey: ["/api/duels/challenges"],
    queryFn: async () => {
      const res = await fetch("/api/duels/challenges");
      if (!res.ok) throw new Error("Failed to fetch challenges");
      return res.json();
    }
  });
  
  // Obtener historial de duelos
  const { 
    data: matches, 
    isLoading: matchesLoading,
    refetch: refetchMatches
  } = useQuery({
    queryKey: ["/api/duels/matches"],
    queryFn: async () => {
      const res = await fetch("/api/duels/matches");
      if (!res.ok) throw new Error("Failed to fetch match history");
      return res.json();
    }
  });
  
  // Unirse a la cola
  const joinQueueMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/duels/queue/join");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Joined Queue",
        description: "You have joined the duel queue.",
      });
      refetchQueueStatus();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Salir de la cola
  const leaveQueueMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/duels/queue/leave");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Left Queue",
        description: "You have left the duel queue.",
      });
      refetchQueueStatus();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Cancelar duelo activo
  const cancelMatchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/duels/match/cancel");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Duelo cancelado",
        description: "Has cancelado el duelo correctamente.",
      });
      refetchQueueStatus();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo cancelar el duelo. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  });
  
  // Aceptar un desafío
  const acceptChallengeMutation = useMutation({
    mutationFn: async (challengeId: number) => {
      const res = await apiRequest("PUT", `/api/duels/challenge/${challengeId}/respond`, { accept: true });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Challenge Accepted",
        description: "You have accepted the duel challenge.",
      });
      refetchChallenges();
      refetchMatches();
      setActiveTab("matches");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Rechazar un desafío
  const rejectChallengeMutation = useMutation({
    mutationFn: async (challengeId: number) => {
      const res = await apiRequest("PUT", `/api/duels/challenge/${challengeId}/respond`, { accept: false });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Challenge Rejected",
        description: "You have rejected the duel challenge.",
      });
      refetchChallenges();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Obtener información del terminal
  const {
    data: terminalSession,
    isLoading: terminalSessionLoading,
    refetch: refetchTerminalSession
  } = useQuery({
    queryKey: ["/api/duels/terminal/active"],
    queryFn: async () => {
      const res = await fetch("/api/duels/terminal/active");
      if (!res.ok) throw new Error("Failed to fetch terminal session");
      return res.json();
    },
    refetchInterval: 10000
  });

  // Si hay un duelo activo, cambiar automáticamente a la pestaña de duelos
  useEffect(() => {
    if (queueStatus?.activeMatch) {
      setActiveTab("matches");
    }
  }, [queueStatus]);

  // Actualizar la sesión de terminal cuando cambia
  useEffect(() => {
    if (terminalSession) {
      setActiveTerminalSession(terminalSession);
    }
  }, [terminalSession]);
  
  return (
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Docker Duels</h1>
          <div className="flex items-center">
            {statsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : stats ? (
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-yellow-500" />
                  <span>Rating: {stats.duelRating}</span>
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Award className="h-3 w-3 text-green-500" />
                  <span>W: {stats.duelWins}</span>
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Ban className="h-3 w-3 text-red-500" />
                  <span>L: {stats.duelLosses}</span>
                </Badge>
              </div>
            ) : (
              <span>No stats available</span>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="queue">Queue</TabsTrigger>
                <TabsTrigger value="challenges">Challenges</TabsTrigger>
                <TabsTrigger value="matches">Matches</TabsTrigger>
              </TabsList>
              
              {/* Cola de Duelo */}
              <TabsContent value="queue" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Duel Queue
                    </CardTitle>
                    <CardDescription>
                      Join the queue to be matched with another player for a Docker Duel.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {queueStatusLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : queueStatus?.inQueue ? (
                      <div className="text-center py-4">
                        <div className="mb-4 text-lg">You are in the queue</div>
                        <div className="flex justify-center">
                          <div className="animate-pulse bg-primary/20 rounded-full h-16 w-16 flex items-center justify-center">
                            <div className="bg-primary/30 rounded-full h-12 w-12 flex items-center justify-center">
                              <div className="bg-primary/40 rounded-full h-8 w-8"></div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 text-sm text-muted-foreground">Searching for opponents...</div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          This may take a few minutes depending on activity
                        </div>
                      </div>
                    ) : queueStatus?.activeMatch ? (
                      <div className="text-center py-4">
                        <div className="mb-4 text-lg">You have an active match!</div>
                        <Button 
                          onClick={() => setActiveTab("matches")}
                          className="gap-2"
                        >
                          <Play className="h-4 w-4" />
                          Go to Match
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="mb-4">Ready to test your skills?</div>
                        <Button 
                          onClick={() => joinQueueMutation.mutate()}
                          disabled={joinQueueMutation.isPending}
                          className="gap-2"
                        >
                          {joinQueueMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                          Join Queue
                        </Button>
                      </div>
                    )}
                  </CardContent>
                  {queueStatus?.inQueue && (
                    <CardFooter className="flex justify-center">
                      <Button 
                        variant="outline" 
                        onClick={() => leaveQueueMutation.mutate()}
                        disabled={leaveQueueMutation.isPending}
                      >
                        {leaveQueueMutation.isPending && (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        )}
                        Leave Queue
                      </Button>
                    </CardFooter>
                  )}
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>How Docker Duels Work</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p>
                      <strong>Docker Duels</strong> pits you against another player in real-time on 
                      identical vulnerable containers.
                    </p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Join the queue or directly challenge another player</li>
                      <li>You'll both get access to identical Kali Linux containers</li>
                      <li>Race to find and exploit vulnerabilities</li>
                      <li>The first player to capture all flags wins</li>
                      <li>Your rating will increase or decrease based on the result</li>
                    </ol>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Desafíos */}
              <TabsContent value="challenges" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Duel Challenges
                    </CardTitle>
                    <CardDescription>
                      View and respond to direct challenges from other players.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {challengesLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : challenges && challenges.length > 0 ? (
                      <div className="space-y-4">
                        {challenges.filter((c: DuelChallenge) => c.status === "pending").map((challenge: DuelChallenge) => (
                          <div key={challenge.id} className="border rounded-md p-4">
                            <div className="flex justify-between items-center mb-2">
                              <div className="font-medium">
                                {challenge.challengerId === (stats?.userId || 0) ? 
                                  <span>You challenged another player</span> : 
                                  <span>You were challenged</span>
                                }
                              </div>
                              <Badge className={`${getStatusColor(challenge.status)}`}>
                                {challenge.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mb-2">
                              Created: {formatDate(challenge.createdAt)}
                            </div>
                            <div className="text-sm text-muted-foreground mb-4">
                              Expires: {formatDate(challenge.expiresAt)}
                            </div>
                            {challenge.challengedId === (stats?.userId || 0) && challenge.status === "pending" && (
                              <div className="flex gap-2 justify-end">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => rejectChallengeMutation.mutate(challenge.id)}
                                  disabled={rejectChallengeMutation.isPending}
                                >
                                  {rejectChallengeMutation.isPending && (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  )}
                                  Reject
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={() => acceptChallengeMutation.mutate(challenge.id)}
                                  disabled={acceptChallengeMutation.isPending}
                                >
                                  {acceptChallengeMutation.isPending && (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  )}
                                  Accept
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {/* Desafíos históricos */}
                        {challenges.filter((c: DuelChallenge) => c.status !== "pending").length > 0 && (
                          <>
                            <Separator className="my-4" />
                            <h3 className="text-lg font-medium mb-2">Past Challenges</h3>
                            <div className="space-y-2">
                              {challenges
                                .filter((c: DuelChallenge) => c.status !== "pending")
                                .map((challenge: DuelChallenge) => (
                                <div key={challenge.id} className="border rounded-md p-3 flex justify-between items-center">
                                  <div>
                                    <div className="text-sm font-medium">
                                      {challenge.challengerId === (stats?.userId || 0) ? 
                                        <span>You challenged another player</span> : 
                                        <span>You were challenged</span>
                                      }
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {formatDate(challenge.createdAt)}
                                    </div>
                                  </div>
                                  <Badge className={`${getStatusColor(challenge.status)}`}>
                                    {challenge.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No challenges found
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Duelos */}
              <TabsContent value="matches" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Play className="h-5 w-5" />
                      Active Match
                    </CardTitle>
                    <CardDescription>
                      Your current Docker Duel match in progress.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {queueStatusLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : queueStatus?.activeMatch ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="text-lg font-medium">
                            Match #{queueStatus.activeMatch.id}
                          </div>
                          <Badge className={`${getStatusColor(queueStatus.activeMatch.status)}`}>
                            {queueStatus.activeMatch.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 py-4">
                          <div className="text-center">
                            <div className="text-sm font-medium mb-1">Player 1</div>
                            <div className="flex justify-center">
                              <Avatar className="h-12 w-12">
                                <AvatarFallback className="bg-primary/20">
                                  P1
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="mt-1 text-sm">
                              {queueStatus.activeMatch.player1Id === (stats?.userId || 0) ? 
                                <span className="font-medium">You</span> : 
                                <span>Opponent</span>}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-center">
                            <div className="text-2xl font-bold">VS</div>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-sm font-medium mb-1">Player 2</div>
                            <div className="flex justify-center">
                              <Avatar className="h-12 w-12">
                                <AvatarFallback className="bg-primary/20">
                                  P2
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="mt-1 text-sm">
                              {queueStatus.activeMatch.player2Id === (stats?.userId || 0) ? 
                                <span className="font-medium">You</span> : 
                                <span>Opponent</span>}
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-muted p-4 rounded-md">
                          <div className="text-sm font-medium mb-2">Match Status</div>
                          {queueStatus.activeMatch.status === "preparing" ? (
                            <div className="text-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Preparing containers...</span>
                              </div>
                              <p>The Docker containers are being prepared. This might take a minute.</p>
                              
                              {/* Botón de cancelación para duelos en preparación */}
                              <div className="mt-4 flex justify-end">
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => cancelMatchMutation.mutate()}
                                  disabled={cancelMatchMutation.isPending}
                                >
                                  {cancelMatchMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Ban className="h-4 w-4 mr-2" />
                                  )}
                                  Cancel Match
                                </Button>
                              </div>
                            </div>
                          ) : queueStatus.activeMatch.status === "in_progress" ? (
                            <div className="text-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className="h-4 w-4" />
                                <span>Match in progress</span>
                              </div>
                              
                              {/* Botón de cancelación para duelos en progreso */}
                              <div className="mt-2 mb-4 flex justify-end">
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => cancelMatchMutation.mutate()}
                                  disabled={cancelMatchMutation.isPending}
                                >
                                  {cancelMatchMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Ban className="h-4 w-4 mr-2" />
                                  )}
                                  Cancel Match
                                </Button>
                              </div>
                              
                              {/* Terminal web para duelos */}
                              {activeTerminalSession && (
                                <div className="mt-4 mb-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Terminal className="h-4 w-4" />
                                    <span className="font-medium">Terminal Access</span>
                                  </div>
                                  <div className="h-[400px] border rounded-md overflow-hidden">
                                    {activeTerminalSession ? (
                                      <WebTerminal 
                                        sessionId={activeTerminalSession.sessionId} 
                                        token={activeTerminalSession.token}
                                        isActive={true}
                                      />
                                    ) : (
                                      <div className="flex items-center justify-center h-full bg-muted/30">
                                        <div className="text-center">
                                          <Terminal className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                          <p className="text-muted-foreground">Conectando al terminal...</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {queueStatus.activeMatch.containerData ? (
                                <div className="mt-4 p-3 bg-card rounded border">
                                  <div className="font-medium mb-2">Your Container:</div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="text-xs">
                                      <div className="font-medium">Container ID:</div>
                                      <div className="font-mono bg-muted p-1 rounded text-xs overflow-x-auto">
                                        {queueStatus.activeMatch.player1Id === (stats?.userId || 0) ?
                                          queueStatus.activeMatch.containerData.player1Container :
                                          queueStatus.activeMatch.containerData.player2Container}
                                      </div>
                                    </div>
                                    <div className="text-xs">
                                      <div className="font-medium">IP Address:</div>
                                      <div className="font-mono bg-muted p-1 rounded text-xs">
                                        {queueStatus.activeMatch.player1Id === (stats?.userId || 0) ?
                                          queueStatus.activeMatch.containerData.player1Ip :
                                          queueStatus.activeMatch.containerData.player2Ip}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    Use SSH to connect: <code className="text-xs">ssh root@your-ip-address</code><br/>
                                    Password: <code className="text-xs">duel42ctf</code>
                                  </div>
                                </div>
                              ) : (
                                <p>Container information will appear here once ready.</p>
                              )}
                            </div>
                          ) : ["player1_victory", "player2_victory"].includes(queueStatus.activeMatch.status) ? (
                            <div className="text-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <Trophy className="h-4 w-4 text-yellow-500" />
                                <span>Match completed</span>
                              </div>
                              <div className="font-medium">
                                {queueStatus.activeMatch.winnerId === (stats?.userId || 0) ? (
                                  <span className="text-green-500">You won!</span>
                                ) : (
                                  <span className="text-red-500">You lost.</span>
                                )}
                              </div>
                              {queueStatus.activeMatch.scoreChange && (
                                <div className="mt-1">
                                  Rating change: 
                                  <span className={queueStatus.activeMatch.winnerId === (stats?.userId || 0) ? 
                                    " text-green-500" : " text-red-500"}>
                                    {queueStatus.activeMatch.winnerId === (stats?.userId || 0) ? 
                                      ` +${queueStatus.activeMatch.scoreChange}` : 
                                      ` -${queueStatus.activeMatch.scoreChange}`}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <span>Match status: {queueStatus.activeMatch.status}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No active match
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Historial de duelos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Match History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {matchesLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : matches && matches.length > 0 ? (
                      <div className="space-y-3">
                        {matches.map((match: DuelMatch) => (
                          <div key={match.id} className="border rounded-md p-3">
                            <div className="flex justify-between items-center mb-1">
                              <div className="font-medium">Match #{match.id}</div>
                              <Badge className={`${getStatusColor(match.status)}`}>
                                {match.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mb-2">
                              {formatDate(match.startedAt)}
                            </div>
                            <div className="text-sm">
                              {["player1_victory", "player2_victory"].includes(match.status) && (
                                <div className="mt-1">
                                  Result: 
                                  <span className={match.winnerId === (stats?.userId || 0) ? 
                                    " text-green-500 font-medium" : " text-red-500 font-medium"}>
                                    {match.winnerId === (stats?.userId || 0) ? 
                                      " Victory" : " Defeat"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No match history found
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Sidebar - Leaderboard */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Leaderboard
                </CardTitle>
                <CardDescription>
                  Top Docker Duel competitors
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leaderboardLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : leaderboard && leaderboard.length > 0 ? (
                  <div className="space-y-2">
                    {leaderboard.slice(0, 10).map((entry: LeaderboardEntry, index: number) => (
                      <div key={entry.userId} className="flex items-center py-2 border-b last:border-0">
                        <div className="w-6 font-bold text-muted-foreground mr-2">
                          {index + 1}.
                        </div>
                        <div className="flex-1 font-medium">
                          <Link href={`/profile/${entry.userId}`} className="hover:underline">
                            {entry.username}
                          </Link>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{entry.rating}</div>
                          <div className="text-xs text-muted-foreground">
                            {entry.wins}W - {entry.losses}L
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No leaderboard data
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}

export default DuelsPage;