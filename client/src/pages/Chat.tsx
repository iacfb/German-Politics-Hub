import { Layout } from "@/components/Layout";
import { useChatStream } from "@/hooks/use-chat-stream";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Bot, User as UserIcon, AlertCircle, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import clsx from "clsx";

export default function Chat() {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  
  // Fetch conversations list
  const { data: conversations, isLoading: loadingConvos } = useQuery({
    queryKey: ['/api/conversations'],
    queryFn: async () => {
      const res = await fetch('/api/conversations');
      if (!res.ok) throw new Error('Failed to fetch conversations');
      return await res.json();
    },
    enabled: !!user,
  });

  const queryClient = useQueryClient();
  const createConversation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Neue politische Diskussion' }),
      });
      if (!res.ok) throw new Error('Failed to create');
      return await res.json();
    },
    onSuccess: (newConvo) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setActiveConversationId(newConvo.id);
    }
  });

  const { messages, isStreaming, error, sendMessage, loadHistory } = useChatStream(activeConversationId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeConversationId) {
      loadHistory();
    }
  }, [activeConversationId, loadHistory]);

  useEffect(() => {
    if (conversations && conversations.length > 0 && !activeConversationId) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    
    if (!activeConversationId) {
      createConversation.mutate(undefined, {
        onSuccess: () => {
          setTimeout(() => sendMessage(input), 100);
          setInput("");
        }
      });
    } else {
      sendMessage(input);
      setInput("");
    }
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-100px)] gap-6">
        <div className="w-64 hidden md:flex flex-col gap-4">
          <Button 
            onClick={() => createConversation.mutate()} 
            className="w-full justify-start" 
            variant="outline"
            disabled={createConversation.isPending}
          >
            <Plus className="w-4 h-4 mr-2" /> Neuer Chat
          </Button>
          
          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-4">
              {conversations?.map((convo: any) => (
                <button
                  key={convo.id}
                  onClick={() => setActiveConversationId(convo.id)}
                  className={clsx(
                    "w-full text-left px-4 py-3 rounded-lg text-sm transition-colors",
                    activeConversationId === convo.id
                      ? "bg-secondary text-secondary-foreground font-medium"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  {convo.title}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        <Card className="flex-1 flex flex-col shadow-xl overflow-hidden border-border/50">
          <div className="p-4 border-b bg-muted/30">
            <h2 className="font-bold flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              CivicChat AI
            </h2>
            <p className="text-xs text-muted-foreground">Transparente Quellenangaben inklusive.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                <Bot className="w-12 h-12 mb-4" />
                <p>Starte ein Gespräch über deutsche Politik.</p>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={clsx(
                  "flex gap-4 max-w-3xl",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <div className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-[#FFCC00] text-black"
                )}>
                  {msg.role === 'user' ? <UserIcon className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                
                <div className={clsx(
                  "p-4 rounded-2xl text-sm leading-relaxed",
                  msg.role === 'user' 
                    ? "bg-primary text-primary-foreground rounded-tr-sm" 
                    : "bg-secondary text-secondary-foreground rounded-tl-sm"
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {error && (
              <div className="flex items-center justify-center text-destructive gap-2 text-sm p-4 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          <div className="p-4 bg-background border-t">
            <form onSubmit={handleSubmit} className="flex gap-2 max-w-3xl mx-auto">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Frage nach politischen Themen..."
                className="flex-1"
                disabled={isStreaming}
              />
              <Button type="submit" size="icon" disabled={isStreaming || !input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
