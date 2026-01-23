import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Import Pages
import Dashboard from "@/pages/Dashboard";
import Quizzes from "@/pages/Quizzes";
import QuizPlayer from "@/pages/QuizPlayer";
import Polls from "@/pages/Polls";
import News from "@/pages/News";
import Chat from "@/pages/Chat";
import About from "@/pages/About";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/quizzes" component={Quizzes} />
      <Route path="/quizzes/:id" component={QuizPlayer} />
      <Route path="/polls" component={Polls} />
      <Route path="/news" component={News} />
      <Route path="/chat" component={Chat} />
      <Route path="/about" component={About} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
