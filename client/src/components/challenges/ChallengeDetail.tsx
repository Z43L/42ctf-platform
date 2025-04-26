import { useState } from "react";
import { Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CategoryBadge from "@/components/ui/category-badge";
import FlagSubmission from "./FlagSubmission";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

interface ChallengeDetailProps {
  challengeId: number;
}

export default function ChallengeDetail({ challengeId }: ChallengeDetailProps) {
  const { toast } = useToast();
  const [revealingHint, setRevealingHint] = useState(false);

  const { data: challenge, isLoading } = useQuery<any>({ 
    queryKey: [`/api/challenges/${challengeId}`],
  });

  const unlockHintMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/challenges/${challengeId}/hint`, {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Hint Unlocked!",
        description: `You've unlocked a hint at a cost of ${data.cost} points.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/challenges/${challengeId}`] });
      setRevealingHint(false);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to unlock hint. Please try again.",
      });
      setRevealingHint(false);
    }
  });

  const handleUnlockHint = () => {
    setRevealingHint(true);
    unlockHintMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Challenge not found</h2>
        <p className="text-text-secondary">The challenge you're looking for doesn't exist or has been removed.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <CategoryBadge 
            name={challenge.category?.name || "Uncategorized"} 
            color={challenge.category?.color || "#808080"} 
            className="mr-2"
          />
          <span className="inline-block px-2 py-1 bg-background-subtle text-text-muted text-xs rounded font-medium">
            {challenge.points} pts
          </span>
          {challenge.solved && (
            <span className="ml-auto inline-block px-2 py-1 bg-accent-green bg-opacity-20 text-accent-green text-xs rounded font-medium">
              Solved
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold mb-4">{challenge.title}</h1>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium mb-3">Description</h3>
          <p className="text-text-secondary whitespace-pre-wrap mb-4">{challenge.description}</p>
          
          {challenge.resourceUrl && (
            <div className="mt-4 p-4 bg-background-subtle rounded-md">
              <h4 className="text-sm font-medium mb-2">Challenge Resources</h4>
              <div className="flex items-center text-sm">
                <Link className="h-4 w-4 mr-2 text-accent-cyan" />
                <a 
                  href={challenge.resourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-accent-cyan hover:underline"
                >
                  {challenge.resourceUrl}
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flag submission form */}
      {!challenge.solved && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <FlagSubmission challengeId={challengeId} />
          </CardContent>
        </Card>
      )}

      {/* Hint section */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium mb-3">Hint</h3>
          
          {challenge.hintUnlocked ? (
            <div className="p-4 bg-background-subtle rounded-md">
              <p className="text-text-secondary">{challenge.hint}</p>
            </div>
          ) : (
            <div className="p-4 bg-background-subtle rounded-md flex items-start justify-between">
              <div>
                <p className="text-text-secondary text-sm">
                  Stuck? You can unlock a hint (-{challenge.hintCost} points)
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleUnlockHint}
                disabled={revealingHint}
              >
                {revealingHint ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Unlock Hint
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <span className="text-text-muted text-sm">{challenge.solves} teams have solved this challenge</span>
      </div>
    </div>
  );
}
