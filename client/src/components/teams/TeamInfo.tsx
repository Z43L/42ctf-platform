import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TeamMemberCard from "@/components/dashboard/TeamMemberCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface TeamInfoProps {
  teamId: number;
  currentUser: any;
}

const editTeamSchema = z.object({
  name: z.string().min(3, { message: "Team name must be at least 3 characters" }),
  description: z.string().optional(),
});

export default function TeamInfo({ teamId, currentUser }: TeamInfoProps) {
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: team, isLoading: teamLoading } = useQuery<any>({ 
    queryKey: [`/api/teams/${teamId}`],
  });

  const { data: members, isLoading: membersLoading } = useQuery<any[]>({ 
    queryKey: [`/api/teams/${teamId}/members`],
  });

  const form = useForm<z.infer<typeof editTeamSchema>>({
    resolver: zodResolver(editTeamSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Set form values when team data is loaded
  useState(() => {
    if (team) {
      form.reset({
        name: team.name,
        description: team.description || "",
      });
    }
  });

  const editTeamMutation = useMutation({
    mutationFn: async (data: z.infer<typeof editTeamSchema>) => {
      const res = await apiRequest("PUT", `/api/teams/${teamId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}`] });
      toast({
        title: "Team Updated",
        description: "Team information has been updated successfully.",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update team. Please try again.",
      });
    }
  });

  const joinTeamMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/teams/${teamId}/join`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Join Request Sent",
        description: "Your request to join the team has been sent to the team captain.",
      });
      setIsJoining(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to join team. Please try again.",
      });
      setIsJoining(false);
    }
  });

  const leaveTeamMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/teams/${teamId}/leave`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Left Team",
        description: "You have left the team successfully.",
      });
      setIsLeaving(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to leave team. Please try again.",
      });
      setIsLeaving(false);
    }
  });

  const handleJoinTeam = () => {
    setIsJoining(true);
    joinTeamMutation.mutate();
  };

  const handleLeaveTeam = () => {
    setIsLeaving(true);
    leaveTeamMutation.mutate();
  };

  const onSubmit = (data: z.infer<typeof editTeamSchema>) => {
    editTeamMutation.mutate(data);
  };

  if (teamLoading || membersLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Team not found</h2>
        <p className="text-text-secondary">The team you're looking for doesn't exist or has been removed.</p>
      </div>
    );
  }

  const isTeamMember = currentUser.teamId === team.id;
  const isTeamCaptain = currentUser.id === team.captainId;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{team.name}</h1>
          {team.description && <p className="text-text-secondary mt-1">{team.description}</p>}
        </div>
        <div className="mt-4 md:mt-0 space-x-2">
          {isTeamMember ? (
            <>
              {isTeamCaptain && (
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Edit Team</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Team Information</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Team Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description (Optional)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  value={field.value || ""} 
                                  placeholder="Describe your team..." 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsEditDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={editTeamMutation.isPending}
                          >
                            {editTeamMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Save Changes
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
              <Button 
                variant="destructive" 
                onClick={handleLeaveTeam}
                disabled={isLeaving}
              >
                {isLeaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Leave Team
              </Button>
            </>
          ) : (
            !currentUser.teamId && (
              <Button 
                onClick={handleJoinTeam}
                disabled={isJoining}
              >
                {isJoining ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Join Team
              </Button>
            )
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center mb-6">
            <div className="flex-1 mb-4 md:mb-0">
              <h3 className="text-lg font-semibold mb-1">Team Progress</h3>
              <p className="text-text-secondary text-sm">
                Currently with {team.points || 0} points
              </p>
            </div>
            <div className="flex space-x-4">
              <div className="text-center">
                <p className="text-accent-cyan text-2xl font-bold">{team.solvedChallenges || 0}</p>
                <p className="text-text-muted text-xs">Challenges<br/>Solved</p>
              </div>
              <div className="text-center">
                <p className="text-accent-orange text-2xl font-bold">{members?.length || 0}</p>
                <p className="text-text-muted text-xs">Team<br/>Members</p>
              </div>
              <div className="text-center">
                <p className="text-accent-green text-2xl font-bold">{team.firstBloods || 0}</p>
                <p className="text-text-muted text-xs">First<br/>Bloods</p>
              </div>
            </div>
          </div>

          <h4 className="font-medium text-sm text-text-secondary mb-3">TEAM MEMBERS</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {members && members.length > 0 ? (
              members.map((member) => (
                <TeamMemberCard
                  key={member.id}
                  username={member.username}
                  points={member.points || 0}
                  role={member.id === team.captainId ? "Captain" : "Member"}
                  avatarColor={member.avatarColor}
                />
              ))
            ) : (
              <p className="text-text-muted col-span-3">No members in this team yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
