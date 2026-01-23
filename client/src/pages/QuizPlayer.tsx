import { Layout } from "@/components/Layout";
import { useQuiz, useSubmitQuiz } from "@/hooks/use-quizzes";
import { useRoute, useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function QuizPlayer() {
  const [, params] = useRoute("/quizzes/:id");
  const id = parseInt(params?.id || "0");
  const [, setLocation] = useLocation();
  const { data: quiz, isLoading } = useQuiz(id);
  const submitQuiz = useSubmitQuiz();
  
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<any>(null);

  if (isLoading) return <Layout><div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div></Layout>;
  if (!quiz) return <Layout><div>Quiz not found</div></Layout>;

  const questions = quiz.questions || [];
  const currentQuestion = questions[currentQuestionIdx];
  const progress = ((currentQuestionIdx + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestionIdx === questions.length - 1;

  const handleOptionSelect = (optionId: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id.toString()]: parseInt(optionId)
    }));
  };

  const handleNext = async () => {
    if (isLastQuestion) {
      try {
        const res = await submitQuiz.mutateAsync({ id, answers });
        setResult(res);
      } catch (e) {
        // Error handled in hook
      }
    } else {
      setCurrentQuestionIdx(prev => prev + 1);
    }
  };

  if (result) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12 text-center space-y-8">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600"
          >
            <CheckCircle2 className="w-12 h-12" />
          </motion.div>
          
          <h1 className="text-4xl font-display font-bold">Result: {result.matchedParty}</h1>
          <p className="text-muted-foreground text-lg">
            Based on your answers, your views align most closely with the {result.matchedParty}.
          </p>
          
          <div className="grid gap-4 bg-card p-6 rounded-2xl border shadow-sm text-left">
            <h3 className="font-bold mb-4">Party Alignment Breakdown</h3>
            {Object.entries(result.partyScores).map(([party, score]: [string, any]) => (
              <div key={party} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{party}</span>
                  <span className="font-mono">{score}%</span>
                </div>
                <Progress value={score} className="h-2" />
              </div>
            ))}
          </div>

          <Button onClick={() => setLocation("/quizzes")} size="lg">Back to Quizzes</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-8 space-y-2">
          <div className="flex justify-between text-sm font-medium text-muted-foreground">
            <span>Question {currentQuestionIdx + 1} of {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="shadow-lg border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="text-2xl">{currentQuestion.text}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <RadioGroup 
                  onValueChange={handleOptionSelect} 
                  value={answers[currentQuestion.id.toString()]?.toString()}
                  className="space-y-3"
                >
                  {currentQuestion.options.map((option: any) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.id.toString()} id={`option-${option.id}`} className="sr-only" />
                      <Label 
                        htmlFor={`option-${option.id}`}
                        className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          answers[currentQuestion.id.toString()] === option.id 
                            ? "border-primary bg-primary/5 shadow-md" 
                            : "border-muted hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        {option.text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleNext} 
                    disabled={!answers[currentQuestion.id.toString()] || submitQuiz.isPending}
                    className="w-full sm:w-auto"
                    size="lg"
                  >
                    {isLastQuestion ? (submitQuiz.isPending ? "Calculating..." : "Submit Results") : "Next Question"}
                    {!isLastQuestion && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </Layout>
  );
}
