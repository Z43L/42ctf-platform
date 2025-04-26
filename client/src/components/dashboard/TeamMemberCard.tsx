import UserAvatar from "@/components/ui/user-avatar";

interface TeamMemberCardProps {
  username: string;
  points: number;
  role: string;
  avatarColor?: string;
}

export default function TeamMemberCard({ 
  username, 
  points, 
  role,
  avatarColor
}: TeamMemberCardProps) {
  return (
    <div className="flex items-center p-3 bg-background-subtle rounded-md">
      <UserAvatar user={{ username, avatarColor }} />
      <div className="ml-3">
        <p className="font-medium">{username}</p>
        <p className="text-text-muted text-xs">{points} points • {role}</p>
      </div>
    </div>
  );
}
