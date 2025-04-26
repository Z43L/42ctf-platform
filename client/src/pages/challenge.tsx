import { useParams } from "wouter";
import ChallengeDetail from "@/components/challenges/ChallengeDetail";

export default function Challenge() {
  // Get the challenge ID from the URL
  const { id } = useParams<{ id: string }>();
  const challengeId = parseInt(id);

  if (isNaN(challengeId)) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-bold mb-4">Invalid Challenge ID</h2>
        <p className="text-text-secondary">The challenge ID provided is not valid.</p>
      </div>
    );
  }

  return <ChallengeDetail challengeId={challengeId} />;
}
