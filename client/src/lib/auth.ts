import { apiRequest } from "./queryClient";
import { queryClient } from "./queryClient";

// User types
export interface User {
  id: number;
  username: string;
  email: string;
  bio?: string;
  avatarColor?: string;
  isAdmin: boolean;
  teamId?: number | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  bio?: string;
  avatarColor?: string;
}

// Login function
export async function login(credentials: LoginCredentials): Promise<User> {
  const res = await apiRequest("POST", "/api/auth/login", credentials);
  const data = await res.json();
  
  if (!data.user) {
    throw new Error("Failed to authenticate: Invalid response format");
  }
  
  // Update the query data directly
  queryClient.setQueryData(["/api/auth/user"], data.user);
  
  return data.user;
}

// Register function
export async function register(data: RegisterData): Promise<User> {
  const res = await apiRequest("POST", "/api/auth/register", data);
  const userData = await res.json();
  
  // No need to set in the query cache as the user will need to login after registration
  return userData;
}

// Logout function
export async function logout(): Promise<void> {
  await apiRequest("POST", "/api/auth/logout", {});
  
  // Clear all queries from cache
  queryClient.clear();
}

// Update user profile
export async function updateProfile(userId: number, data: Partial<User>): Promise<User> {
  const res = await apiRequest("PUT", `/api/users/${userId}`, data);
  const updatedUser = await res.json();
  
  // Invalidate the user query to force a refetch
  queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  
  return updatedUser;
}

// Generate a random avatar color
export function generateRandomColor(): string {
  const colors = [
    "#00BCD4", // Cyan
    "#00E676", // Green
    "#FF5722", // Orange
    "#9C27B0", // Purple
    "#F44336", // Red
    "#FF9800", // Amber
    "#3F51B5", // Indigo
    "#795548", // Brown
    "#607D8B", // Blue Grey
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
}

// Get avatar initials from username
export function getInitials(username: string): string {
  if (!username) return "";
  return username.charAt(0).toUpperCase();
}
