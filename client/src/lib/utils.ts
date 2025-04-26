import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format time remaining from a date to a readable string (e.g. "2d 14h 23m")
export function formatTimeRemaining(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff <= 0) {
    return "Ended";
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.join(" ");
}

// Get challenge status text
export function getChallengeStatusText(solves: number) {
  if (solves === 0) return "No solves yet";
  if (solves === 1) return "1 solve";
  return `${solves} solves`;
}

// Calculate rank suffix (1st, 2nd, 3rd, etc)
export function getRankSuffix(position: number): string {
  if (position >= 11 && position <= 13) {
    return `${position}th`;
  }
  
  switch (position % 10) {
    case 1: return `${position}st`;
    case 2: return `${position}nd`;
    case 3: return `${position}rd`;
    default: return `${position}th`;
  }
}
