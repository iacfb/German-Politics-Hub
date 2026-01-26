import { Layout } from "@/components/Layout";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  Send, 
  User as UserIcon, 
  AlertCircle, 
  ChevronRight, 
  MessageSquareText,
  Search
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import clsx from "clsx";
import { useChatStream } from "@/hooks/use-chat-stream";

const politicians = [
  {
    name: "AI Representative of Alice Weidel",
    party: "AfD",
    image: "https://th.bing.com/th/id/R.9b7c5717452020311def5dd1cb33ffdd?rik=RVJBp1HMVgkyXw&pid=ImgRaw&r=0",
    persona: "Du bist eine KI-Repräsentantin von Alice Weidel, Bundessprecherin der AfD. Du vertrittst konsequent die Positionen deiner Partei: EU-Skeptizismus, strikte Begrenzung von Zuwanderung, Kritik an der Energiewende und Fokus auf nationale Interessen. Dein Tonfall ist direkt, oft konfrontativ gegenüber dem 'Establishment' und den Altparteien. Du sprichst förmlich, aber bestimmt."
  },
  {
    name: "AI Representative of Friedrich Merz",
    party: "CDU",
    image: "https://cdu-nord.de/wp-content/uploads/2024/01/CDU-Logo-Avatar-1280x1280.png",
    persona: "Du bist ein KI-Repräsentant von Friedrich Merz, Parteivorsitzender der CDU. Du stehst für wirtschaftsliberale Werte, eine starke Bundeswehr, eine geordnete Migrationspolitik und die Einhaltung der Schuldenbremse. Dein Ton ist staatsmännisch, rhetorisch versiert und oft belehrend. Du betonst die Bedeutung der bürgerlichen Mitte und kritisierst die aktuelle Regierung für ihre Wirtschaftspolitik."
  },
  {
    name: "AI Representative of Olaf Scholz",
    party: "SPD",
    image: "https://spd.berlin/media/2023/05/spdicon.jpg",
    persona: "Du bist ein KI-Repräsentant von Olaf Scholz, Bundeskanzler und SPD-Politiker. Du bist bekannt für deinen ruhigen, fast stoischen Stil ('Scholzomat'). Du betonst soziale Gerechtigkeit, Respekt und die Bedeutung des Zusammenhalts in Europa. In Debatten bleibst du sachlich, weichst aber oft konkreten Fragen mit allgemeinen Formulierungen aus. Du betonst oft die Notwendigkeit von Besonnenheit in der Außenpolitik."
  },
  {
    name: "Verteidigungsminister",
    party: "Staatsrepräsentant",
    image: "https://images.unsplash.com/photo-1590247813693-5541d1c609fd",
    persona: "Du bist der Verteidigungsminister Deutschlands. Deine Aufgabe ist es, die Sicherheitsinteressen des Staates zu vertreten. Du debattierst über die Wiedereinführung der Wehrpflicht, die Ausrüstung der Bundeswehr und die Bündnisverpflichtungen in der NATO. Dein Fokus liegt auf nationaler Sicherheit und Verteidigungsfähigkeit."
  },
  {
    name: "Finanzminister",
    party: "Staatsrepräsentant",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f",
    persona: "Du bist der Finanzminister Deutschlands. Du vertrittst die wirtschaftlichen Interessen des Staates, achtest auf die Einhaltung der Schuldenbremse und die Stabilität der Währung. Du debattierst über Steuerpolitik, Staatsausgaben und die Finanzierung öffentlicher Projekte. Dein Ton ist kühl, analytisch und zahlenorientiert."
  }
];

export default function Debate() {
  const [selectedPolitician, setSelectedPolitician] = useState(politicians[0]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  
  // Custom chat stream logic for specific persona
  const { messages, isStreaming, error, sendMessage, loadHistory } = useChatStream(conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  const startDebate = async (politician: typeof politicians[0]) => {
    setSelectedPolitician(politician);
    // Create a specific conversation for this debate
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        title: `Debatte mit ${politician.name}`,
        systemPrompt: politician.persona 
      }),
    });
    const convo = await res.json();
    setConversationId(convo.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || !conversationId) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] gap-6">
        {/* Politicians Sidebar */}
        <div className="w-full md:w-64 flex flex-col gap-4">
          <h2 className="text-xl font-bold mb-2 text-foreground">Wähle deinen Debattenpartner</h2>
          <ScrollArea className="flex-1 border rounded-xl bg-card/50">
            <div className="space-y-2 p-2">
              {politicians.map((p) => (
                <button
                  key={p.name}
                  onClick={() => startDebate(p)}
                  className={clsx(
                    "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left group",
                    selectedPolitician.name === p.name && conversationId
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-transparent hover:bg-accent/50"
                  )}
                >
                  <img src={p.image} alt={p.name} className="w-10 h-10 rounded-full object-cover border-2 border-background shadow-sm group-hover:scale-105 transition-transform" />
                  <div className="min-w-0">
                    <p className="font-bold text-xs truncate text-foreground">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{p.party}</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Debate Area */}
        <Card className="flex-1 flex flex-col shadow-xl overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm relative">
          {!conversationId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                <img src={selectedPolitician.image} alt={selectedPolitician.name} className="relative w-40 h-40 rounded-full object-cover border-4 border-background shadow-2xl" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-display font-bold text-foreground">{selectedPolitician.name}</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Tritt in den direkten Dialog mit der KI-Repräsentation von {selectedPolitician.name}. Die Antworten spiegeln das Parteiprogramm und die politische Ausrichtung wider.
                </p>
              </div>
              <Button size="lg" onClick={() => startDebate(selectedPolitician)} className="px-12 py-6 text-lg rounded-full">Debatte beitreten</Button>
            </div>
          ) : (
            <>
              <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={selectedPolitician.image} alt={selectedPolitician.name} className="w-10 h-10 rounded-full object-cover border shadow-sm" />
                  <div>
                    <h2 className="font-bold text-sm text-foreground">{selectedPolitician.name}</h2>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">AKTIVE DEBATTE • {selectedPolitician.party}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setConversationId(null)}>Partner wechseln</Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 && (
                  <div className="text-center p-12 text-muted-foreground animate-pulse">
                    <MessageSquareText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="italic">Stelle deine erste Frage an {selectedPolitician.name}...</p>
                  </div>
                )}
                
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={clsx(
                      "flex gap-4 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-500",
                      msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}
                  >
                    <div className={clsx(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm overflow-hidden",
                      msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-card"
                    )}>
                      {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <img src={selectedPolitician.image} className="w-full h-full object-cover" />}
                    </div>
                    
                    <div className={clsx(
                      "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                      msg.role === 'user' 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-muted text-foreground rounded-tl-none border border-border/50"
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
                <div className="max-w-3xl mx-auto space-y-4">
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={`Debattiere mit ${selectedPolitician.name}...`}
                      className="flex-1 rounded-full px-6 bg-muted/50 border-none focus-visible:ring-1 ring-primary"
                      disabled={isStreaming}
                    />
                    <Button type="submit" size="icon" className="rounded-full h-10 w-10 shrink-0 shadow-lg" disabled={isStreaming || !input.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                  <p className="text-[10px] text-center text-muted-foreground italic px-4">
                    *Dies ist keine exakte KI Imitation von Politikern, sondern stellt lediglich grundlegende Interessen der Partei dar und ist als flexibles Parteirogramm nicht wahrzunehmen.
                  </p>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </Layout>
  );
}
