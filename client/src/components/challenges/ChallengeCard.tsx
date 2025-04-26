import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import CategoryBadge from "@/components/ui/category-badge";
import { CheckCircle } from "lucide-react";

interface ChallengeCardProps {
  id: number;
  title: string;
  description: string;
  points: number;
  categoryName: string;
  categoryColor: string;
  solved: boolean;
  solves: number;
}

export default function ChallengeCard({
  id,
  title,
  description,
  points,
  categoryName,
  categoryColor,
  solved,
  solves,
}: ChallengeCardProps) {
  return (
    <Card className="overflow-hidden hover:border-accent-cyan transition-colors duration-150">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <CategoryBadge name={categoryName} color={categoryColor} />
            <span className="inline-block px-2 py-1 bg-background-subtle text-text-muted text-xs rounded font-medium ml-1">
              {points} pts
            </span>
          </div>
          <div>
            {solved ? (
              <span className="flex items-center text-accent-green text-sm">
                <CheckCircle className="h-4 w-4 mr-1" />
                Solved
              </span>
            ) : (
              <span className="text-text-muted text-sm">Unsolved</span>
            )}
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-text-secondary text-sm mb-4 line-clamp-2">{description}</p>
        <div className="flex justify-between items-center">
          <span className="text-xs text-text-muted">{solves} solves</span>
          <Link href={`/challenges/${id}`}>
            <a className="text-accent-cyan text-sm font-medium hover:underline">
              View Challenge
            </a>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}