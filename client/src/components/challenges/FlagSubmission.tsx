import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface FlagSubmissionProps {
  challengeId: number;
}

const flagSchema = z.object({
  flag: z.string().min(1, { message: "Flag cannot be empty" }),
});

export default function FlagSubmission({ challengeId }: FlagSubmissionProps) {
  const { toast } = useToast();
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const form = useForm<z.infer<typeof flagSchema>>({
    resolver: zodResolver(flagSchema),
    defaultValues: {
      flag: "",
    },
  });

  const submitFlagMutation = useMutation({
    mutationFn: async (data: z.infer<typeof flagSchema>) => {
      const res = await apiRequest("POST", `/api/challenges/${challengeId}/submit`, data);
      return res.json();
    },
    onSuccess: (data) => {
      form.reset();
      setShowSuccess(true);
      setSuccessMsg(
        data.isFirstBlood 
          ? `🎉 First Blood! +${data.points} points` 
          : `🎉 Correct! +${data.points} points`
      );
      
      // Invalidate challenge queries
      queryClient.invalidateQueries({ queryKey: [`/api/challenges/${challengeId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      
      toast({
        title: "Correct Flag!",
        description: data.isFirstBlood 
          ? `First Blood! You've earned ${data.points} points.` 
          : `You've earned ${data.points} points.`,
        variant: "default",
      });
    },
    onError: (error: any) => {
      setShowSuccess(false);
      
      toast({
        variant: "destructive",
        title: "Incorrect Flag",
        description: error.message || "The submitted flag is incorrect. Try again.",
      });
    }
  });

  const onSubmit = (data: z.infer<typeof flagSchema>) => {
    submitFlagMutation.mutate(data);
  };

  if (showSuccess) {
    return (
      <div className="p-6 text-center bg-accent-green bg-opacity-10 rounded-md">
        <h3 className="text-xl font-bold text-accent-green mb-2">{successMsg}</h3>
        <p className="text-text-secondary">Challenge completed successfully!</p>
      </div>
    );
  }

  return (
    <>
      <h3 className="text-lg font-medium mb-3">Submit Flag</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="flag"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="flex">
                    <Input
                      placeholder="CTF{y0ur_fl4g_h3r3}"
                      className="flex-1 bg-background-subtle text-text-primary px-4 py-3 rounded-l-md border border-background-subtle focus:border-accent-green focus-visible:ring-0 focus-visible:ring-offset-0 font-mono"
                      {...field}
                    />
                    <Button 
                      type="submit" 
                      className="px-6 py-3 bg-accent-green text-background-elevated font-medium rounded-r-md hover:bg-opacity-90 transition-colors duration-150"
                      disabled={submitFlagMutation.isPending}
                    >
                      {submitFlagMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Submit
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </>
  );
}
