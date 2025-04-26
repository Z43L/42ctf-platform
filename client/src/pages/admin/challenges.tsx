import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import CategoryBadge from "@/components/ui/category-badge";

// Schema for challenge form (create/edit)
const challengeSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  points: z.string().transform((val) => parseInt(val)),
  flag: z.string().min(1, { message: "Flag is required" }),
  resourceUrl: z.string().optional(),
  categoryId: z.string().transform((val) => parseInt(val)),
  hintText: z.string().optional(),
  hintCost: z.string().transform((val) => parseInt(val)),
});

export default function AdminChallenges() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: challenges, isLoading: challengesLoading } = useQuery<any[]>({ 
    queryKey: ["/api/challenges"] 
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<any[]>({ 
    queryKey: ["/api/categories"] 
  });

  const form = useForm<z.infer<typeof challengeSchema>>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      title: "",
      description: "",
      points: "100",
      flag: "",
      resourceUrl: "",
      categoryId: "",
      hintText: "",
      hintCost: "50",
    },
  });

  // Reset form when dialog closes
  const resetForm = () => {
    form.reset({
      title: "",
      description: "",
      points: "100",
      flag: "",
      resourceUrl: "",
      categoryId: "",
      hintText: "",
      hintCost: "50",
    });
    setCurrentChallenge(null);
  };

  // Set form values when editing
  const editChallenge = (challenge: any) => {
    setCurrentChallenge(challenge);
    form.reset({
      title: challenge.title,
      description: challenge.description,
      points: challenge.points.toString(),
      flag: challenge.flag,
      resourceUrl: challenge.resourceUrl || "",
      categoryId: challenge.categoryId.toString(),
      hintText: challenge.hintText || "",
      hintCost: challenge.hintCost.toString(),
    });
    setIsDialogOpen(true);
  };

  // Create/update challenge mutation
  const challengeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof challengeSchema>) => {
      if (currentChallenge) {
        // Update
        const res = await apiRequest("PUT", `/api/admin/challenges/${currentChallenge.id}`, data);
        return res.json();
      } else {
        // Create
        const res = await apiRequest("POST", "/api/admin/challenges", data);
        return res.json();
      }
    },
    onSuccess: () => {
      // Invalidate all challenges-related queries to ensure fresh data
      queryClient.invalidateQueries();
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: currentChallenge ? "Challenge Updated" : "Challenge Created",
        description: currentChallenge 
          ? "The challenge has been updated successfully." 
          : "A new challenge has been created.",
      });
      
      // Manually trigger a page refresh after successful creation
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || `Failed to ${currentChallenge ? "update" : "create"} challenge.`,
      });
    }
  });

  // Delete challenge mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/challenges/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      setIsDeleteDialogOpen(false);
      setDeleteId(null);
      toast({
        title: "Challenge Deleted",
        description: "The challenge has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete challenge.",
      });
    }
  });

  const onSubmit = (data: z.infer<typeof challengeSchema>) => {
    challengeMutation.mutate(data);
  };

  const confirmDelete = (id: number) => {
    setDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Challenges</h1>
          <p className="text-text-secondary mt-1">Create, edit, and delete CTF challenges</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="mt-4 sm:mt-0">
              <Plus className="h-4 w-4 mr-2" />
              Add Challenge
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{currentChallenge ? "Edit Challenge" : "Create New Challenge"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Challenge title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select 
                          value={field.value} 
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories?.map(category => (
                              <SelectItem 
                                key={category.id} 
                                value={category.id.toString()}
                              >
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Detailed challenge description"
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="points"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Points</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            min="1" 
                            placeholder="100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="flag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Flag</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="CTF{flag_here}" 
                            className="font-mono"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="resourceUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resource URL (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="https://challenge-url.example.com"
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hintText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hint (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder="Hint text that users can unlock"
                          rows={2}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hintCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hint Cost</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min="0" 
                          placeholder="50"
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
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={challengeMutation.isPending}
                  >
                    {challengeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {currentChallenge ? "Update Challenge" : "Create Challenge"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </header>

      <Card>
        <CardContent className="p-0">
          {challengesLoading || categoriesLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
            </div>
          ) : challenges && challenges.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Hint</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {challenges.map((challenge) => (
                  <TableRow key={challenge.id}>
                    <TableCell className="font-medium">{challenge.title}</TableCell>
                    <TableCell>
                      <CategoryBadge
                        name={challenge.category.name}
                        color={challenge.category.color}
                      />
                    </TableCell>
                    <TableCell>{challenge.points}</TableCell>
                    <TableCell>{challenge.hintText ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => editChallenge(challenge)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => confirmDelete(challenge.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-text-secondary">No challenges available. Create your first challenge!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p className="py-4">Are you sure you want to delete this challenge? This action cannot be undone.</p>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
