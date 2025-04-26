import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/auth";

interface UserAvatarProps {
  user?: {
    username?: string;
    avatarColor?: string;
  };
  size?: "sm" | "md" | "lg";
}

export default function UserAvatar({ user, size = "md" }: UserAvatarProps) {
  if (!user || !user.username) {
    return null;
  }

  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-md",
    lg: "text-lg",
  };

  const initial = getInitials(user.username);
  const bgColor = user.avatarColor || "#2A2A2A";
  
  // Determine text color based on background
  const getTextColor = () => {
    // Simple mapping of some colors to specific text colors
    const colorMap: Record<string, string> = {
      "#00BCD4": "text-background", // Cyan
      "#00E676": "text-background", // Green
      "#FF5722": "text-background", // Orange
      "#9C27B0": "text-background", // Purple
      "#F44336": "text-background", // Red
      "#FF9800": "text-background", // Amber
    };

    return colorMap[bgColor] || "text-text-primary";
  };

  return (
    <Avatar className={`${sizes[size]} bg-opacity-20`} style={{ backgroundColor: bgColor }}>
      <AvatarFallback 
        className={`${textSizes[size]} font-medium ${getTextColor()}`}
        style={{ backgroundColor: bgColor }}
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
