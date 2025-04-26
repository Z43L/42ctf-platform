import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShieldCheck, ShieldX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import UserAvatar from "@/components/ui/user-avatar";

const userUpdateSchema = z.object({
  isAdmin: z.boolean(),
});

export default function AdminUsers() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const { data: users, isLoading } = useQuery<any[]>({ 
    queryKey: ["/api/users"] 
  });

  const form = useForm<z.infer<typeof userUpdateSchema>>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      isAdmin: false,
    },
  });

  // Set form values when editing
  const editUser = (user: any) => {
    setCurrentUser(user);
    form.reset({
      isAdmin: user.isAdmin,
    });
    setIsDialogOpen(true);
  };

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userUpdateSchema>) => {
      // This endpoint doesn't exist in the provided routes.ts, but would be needed for admin privileges
      const res = await apiRequest("PUT", `/api/admin/users/${currentUser.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDialogOpen(false);
      toast({
        title: "User Updated",
        description: "The user's permissions have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update user.",
      });
    }
  });

  const onSubmit = (data: z.infer<typeof userUpdateSchema>) => {
    updateUserMutation.mutate(data);
  };

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Manage Users</h1>
        <p className="text-text-secondary mt-1">View and manage user accounts and permissions</p>
      </header>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
            </div>
          ) : users && users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <UserAvatar user={user} size="sm" />
                        <span className="ml-2 font-medium">{user.username}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.teamId || "No Team"}</TableCell>
                    <TableCell>
                      {user.isAdmin ? (
                        <div className="flex items-center text-accent-orange">
                          <ShieldCheck className="h-4 w-4 mr-1" />
                          <span>Admin</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-text-muted">
                          <ShieldX className="h-4 w-4 mr-1" />
                          <span>User</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editUser(user)}
                      >
                        Manage Permissions
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-text-secondary">No users available.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Permissions Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage User Permissions</DialogTitle>
          </DialogHeader>
          {currentUser && (
            <div className="py-4">
              <div className="flex items-center mb-6">
                <UserAvatar user={currentUser} size="md" />
                <div className="ml-3">
                  <h3 className="font-medium">{currentUser.username}</h3>
                  <p className="text-sm text-text-muted">{currentUser.email}</p>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="isAdmin"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Administrator Privileges
                          </FormLabel>
                          <FormMessage />
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateUserMutation.isPending}
                    >
                      {updateUserMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
