import { Layout } from "@/components/Layout";
import { usePolls, useVotePoll } from "@/hooks/use-polls";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { motion } from "framer-motion";

export default function Polls() {
  const { data: polls, isLoading } = usePolls();
  const voteMutation = useVotePoll();
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});

  if (isLoading) return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-12 w-48" />
        {[1, 2].map(i => <Skeleton key={i} className="h-64 w-full rounded-2xl" />)}
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">Meinungscheck</h1>
          <p className="text-muted-foreground text-lg">Beteilige dich an aktuellen Umfragen und sieh Trends (keine Anmeldung nötig).</p>
        </div>

        <div className="space-y-6">
          {polls?.map((poll: any) => {
            const hasVoted = !!poll.userVotedOptionId;
            const totalVotes = poll.options.reduce((acc: number, opt: any) => acc + opt.votes, 0);

            return (
              <Card key={poll.id} className="overflow-hidden border-border/50">
                <CardHeader className="bg-muted/30">
                  <CardTitle>{poll.question}</CardTitle>
                  <CardDescription>{poll.description}</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {hasVoted ? (
                    <div className="space-y-4">
                      {poll.options.map((option: any) => {
                        const percent = totalVotes === 0 ? 0 : Math.round((option.votes / totalVotes) * 100);
                        const isUserChoice = poll.userVotedOptionId === option.id;
                        return (
                          <div key={option.id} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className={isUserChoice ? "font-bold text-primary" : ""}>
                                {option.text} {isUserChoice && "(Deine Wahl)"}
                              </span>
                              <span className="font-mono text-muted-foreground">{percent}%</span>
                            </div>
                            <div className="relative h-3 w-full bg-secondary rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percent}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className={`h-full ${isUserChoice ? "bg-primary" : "bg-muted-foreground/30"}`}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground text-right">{option.votes} Stimmen</p>
                          </div>
                        );
                      })}
                      <p className="text-center text-sm text-muted-foreground pt-2">
                        Gesamtstimmen: {totalVotes}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {poll.options.map((option: any) => (
                        <Button
                          key={option.id}
                          variant={selectedOptions[poll.id] === option.id ? "default" : "outline"}
                          className={`w-full justify-start h-auto py-4 px-6 text-left whitespace-normal ${
                            selectedOptions[poll.id] === option.id ? "border-primary" : ""
                          }`}
                          onClick={() => setSelectedOptions(prev => ({ ...prev, [poll.id]: option.id }))}
                        >
                          {option.text}
                        </Button>
                      ))}
                      <div className="pt-4 flex justify-end">
                        <Button
                          onClick={() => voteMutation.mutate({ pollId: poll.id, optionId: selectedOptions[poll.id] })}
                          disabled={!selectedOptions[poll.id] || voteMutation.isPending}
                        >
                          {voteMutation.isPending ? "Wird gesendet..." : "Abstimmen"}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
