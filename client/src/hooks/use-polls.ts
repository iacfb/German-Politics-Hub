import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function usePolls() {
  return useQuery({
    queryKey: [api.polls.list.path],
    queryFn: async () => {
      const res = await fetch(api.polls.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch polls");
      return api.polls.list.responses[200].parse(await res.json());
    },
  });
}

export function useVotePoll() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pollId, optionId }: { pollId: number; optionId: number }) => {
      const url = buildUrl(api.polls.vote.path, { id: pollId });
      const res = await fetch(url, {
        method: api.polls.vote.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized");
        const error = await res.json();
        throw new Error(error.message || "Failed to vote");
      }

      return api.polls.vote.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.polls.list.path] });
      toast({
        title: "Vote Recorded",
        description: "Thank you for participating!",
      });
    },
    onError: (error) => {
      if (error.message === "Unauthorized") {
        toast({
          title: "Login Required",
          description: "Please login to vote.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });
}
