import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { generateRandomColor } from "@/lib/auth";
import UserAvatar from "@/components/ui/user-avatar";

const profileSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  bio: z.string().optional(),
});

export default function Profile() {
  const { toast } = useToast();
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);

  const { data: user, isLoading } = useQuery<any>({ 
    queryKey: ["/api/auth/user"] 
  });

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: "",
      bio: "",
    },
  });

  // Initialize form when user data is loaded
  useState(() => {
    if (user) {
      form.reset({
        email: user.email || "",
        bio: user.bio || "",
      });
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      const res = await apiRequest("PUT", `/api/users/${user.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
      });
    }
  });

  const updateAvatarMutation = useMutation({
    mutationFn: async () => {
      const newColor = generateRandomColor();
      const res = await apiRequest("PUT", `/api/users/${user.id}`, { avatarColor: newColor });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Avatar Updated",
        description: "Your avatar color has been updated.",
      });
      setIsUpdatingAvatar(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update avatar. Please try again.",
      });
      setIsUpdatingAvatar(false);
    }
  });

  const onSubmit = (data: z.infer<typeof profileSchema>) => {
    updateProfileMutation.mutate(data);
  };

  const handleUpdateAvatar = () => {
    setIsUpdatingAvatar(true);
    updateAvatarMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-bold mb-4">Error Loading Profile</h2>
        <p className="text-text-secondary">Unable to load user profile data.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Your Profile</h1>
        <p className="text-text-secondary mt-1">Manage your account settings and information</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Avatar and Basic Info */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Avatar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <UserAvatar user={user} size="lg" />
            <h3 className="mt-4 text-lg font-semibold">{user.username}</h3>
            <p className="text-text-muted text-sm">
              {user.teamId ? "Team Member" : "No Team"}
            </p>
            <Button 
              variant="outline" 
              className="mt-4 w-full"
              onClick={handleUpdateAvatar}
              disabled={isUpdatingAvatar}
            >
              {isUpdatingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Change Avatar Color
            </Button>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="your@email.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          value={field.value || ""} 
                          placeholder="Tell us about yourself..."
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>

            <Separator className="my-6" />

            <div>
              <h3 className="text-lg font-medium mb-4">Account Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Username</span>
                  <span className="font-medium">{user.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Account Type</span>
                  <span className="font-medium">{user.isAdmin ? "Administrator" : "User"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">User ID</span>
                  <span className="font-medium">{user.id}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
