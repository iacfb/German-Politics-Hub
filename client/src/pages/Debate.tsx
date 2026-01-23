import { Layout } from "@/components/Layout";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Bot, User as UserIcon, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import clsx from "clsx";
import { useChatStream } from "@/hooks/use-chat-stream";

const politicians = [
  {
    name: "Alice Weidel",
    party: "AfD",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/2021-05-18_Alice_Weidel_AfD_by_Olaf_Kosinsky-1.jpg/800px-2021-05-18_Alice_Weidel_AfD_by_Olaf_Kosinsky-1.jpg",
    persona: "Du bist Alice Weidel, Bundessprecherin der AfD. Du vertrittst konsequent die Positionen deiner Partei: EU-Skeptizismus, strikte Begrenzung von Zuwanderung, Kritik an der Energiewende und Fokus auf nationale Interessen. Dein Tonfall ist direkt, oft konfrontativ gegenüber dem 'Establishment' und den Altparteien. Du sprichst förmlich, aber bestimmt."
  },
  {
    name: "Friedrich Merz",
    party: "CDU",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Friedrich_Merz_2022.jpg/800px-Friedrich_Merz_2022.jpg",
    persona: "Du bist Friedrich Merz, Parteivorsitzender der CDU. Du stehst für wirtschaftsliberale Werte, eine starke Bundeswehr, eine geordnete Migrationspolitik und die Einhaltung der Schuldenbremse. Dein Ton ist staatsmännisch, rhetorisch versiert und oft belehrend. Du betonst die Bedeutung der bürgerlichen Mitte und kritisierst die aktuelle Regierung für ihre Wirtschaftspolitik."
  },
  {
    name: "Olaf Scholz",
    party: "SPD",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Olaf_Scholz_2022.jpg/800px-Olaf_Scholz_2022.jpg",
    persona: "Du bist Olaf Scholz, Bundeskanzler und SPD-Politiker. Du bist bekannt für deinen ruhigen, fast stoischen Stil ('Scholzomat'). Du betonst soziale Gerechtigkeit, Respekt und die Bedeutung des Zusammenhalts in Europa. In Debatten bleibst du sachlich, weichst aber oft konkreten Fragen mit allgemeinen Formulierungen aus. Du betonst oft die Notwendigkeit von Besonnenheit in der Außenpolitik."
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
          <h2 className="text-xl font-bold mb-2">Wähle deinen Debattenpartner</h2>
          <ScrollArea className="flex-1">
            <div className="space-y-3 pr-4">
              {politicians.map((p) => (
                <button
                  key={p.name}
                  onClick={() => startDebate(p)}
                  className={clsx(
                    "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                    selectedPolitician.name === p.name && conversationId
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-transparent hover:bg-muted"
                  )}
                >
                  <img src={p.image} alt={p.name} className="w-12 h-12 rounded-full object-cover border-2 border-background shadow-sm" />
                  <div>
                    <p className="font-bold text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.party}</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Debate Area */}
        <Card className="flex-1 flex flex-col shadow-xl overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
          {!conversationId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <img src={selectedPolitician.image} alt={selectedPolitician.name} className="w-32 h-32 rounded-full object-cover border-4 border-primary/20 shadow-2xl" />
              <h3 className="text-2xl font-bold">Bereit für eine Debatte mit {selectedPolitician.name}?</h3>
              <p className="text-muted-foreground max-w-md">
                Diskutiere über politische Themen. {selectedPolitician.name} wird gemäß seiner/ihrer realen politischen Überzeugungen und Persönlichkeit antworten.
              </p>
              <Button size="lg" onClick={() => startDebate(selectedPolitician)}>Debatte starten</Button>
            </div>
          ) : (
            <>
              <div className="p-4 border-b bg-muted/30 flex items-center gap-3">
                <img src={selectedPolitician.image} alt={selectedPolitician.name} className="w-10 h-10 rounded-full object-cover border" />
                <div>
                  <h2 className="font-bold">{selectedPolitician.name}</h2>
                  <p className="text-xs text-muted-foreground">Aktive Debatte ({selectedPolitician.party})</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.length === 0 && (
                  <div className="text-center p-8 text-muted-foreground italic">
                    Stelle deine erste Frage an {selectedPolitician.name}...
                  </div>
                )}
                
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={clsx(
                      "flex gap-4 max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-300",
                      msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}
                  >
                    <div className={clsx(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm",
                      msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-card"
                    )}>
                      {msg.role === 'user' ? <UserIcon className="w-5 h-5" /> : <img src={selectedPolitician.image} className="w-full h-full rounded-full object-cover" />}
                    </div>
                    
                    <div className={clsx(
                      "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                      msg.role === 'user' 
                        ? "bg-primary text-primary-foreground rounded-tr-sm" 
                        : "bg-muted text-foreground rounded-tl-sm border border-border/50"
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
                    placeholder={`Debattiere mit ${selectedPolitician.name}...`}
                    className="flex-1 rounded-full px-6"
                    disabled={isStreaming}
                  />
                  <Button type="submit" size="icon" className="rounded-full h-10 w-10 shrink-0" disabled={isStreaming || !input.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </Card>
      </div>
    </Layout>
  );
}
