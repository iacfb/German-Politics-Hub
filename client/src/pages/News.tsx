import { Layout } from "@/components/Layout";
import { useArticles } from "@/hooks/use-articles";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

export default function News() {
  const { data: articles, isLoading } = useArticles();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (isLoading) return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-96 w-full rounded-3xl" />)}
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-12 pb-20">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-display font-bold mb-2">Aktuelle Themen</h1>
          <p className="text-muted-foreground text-xl">Scrolle durch die neuesten politischen Entwicklungen.</p>
        </div>

        <div className="space-y-24">
          {articles?.map((article) => (
            <motion.div 
              key={article.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
            >
              <Card className="overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-card/50 backdrop-blur-sm group">
                {article.imageUrl && (
                  <div className="h-[25rem] overflow-hidden relative">
                    <img 
                      src={article.imageUrl} 
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-6 left-8 right-8">
                      <Badge className="mb-3 bg-white/20 backdrop-blur-md border-none text-white px-4 py-1">
                        {article.source || 'VoiceUp'}
                      </Badge>
                      <h2 className="text-3xl font-bold text-white leading-tight">
                        {article.title}
                      </h2>
                    </div>
                  </div>
                )}
                
                <CardHeader className="p-8 pb-4">
                  <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
                    <span className="font-medium uppercase tracking-widest text-primary">
                      {article.type === 'project' ? 'Projekt' : 'Nachricht'}
                    </span>
                    <span>{format(article.createdAt ? new Date(article.createdAt) : new Date(), 'dd. MMMM yyyy', { locale: de })}</span>
                  </div>
                  {article.summary && (
                    <CardDescription className="text-xl text-foreground font-medium leading-relaxed italic border-l-4 border-primary pl-6 py-2">
                      {article.summary}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="p-8 pt-0">
                  <AnimatePresence initial={false}>
                    {expandedId === article.id ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="text-muted-foreground text-lg leading-relaxed whitespace-pre-wrap pt-4">
                          {article.content}
                        </p>
                        <div className="mt-8 flex gap-4">
                          <Button 
                            variant="outline" 
                            className="rounded-full h-12 px-8"
                            onClick={() => window.open(article.sourceUrl || '#', '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" /> Quelle öffnen
                          </Button>
                          <Button 
                            variant="ghost" 
                            className="rounded-full h-12"
                            onClick={() => setExpandedId(null)}
                          >
                            <ChevronUp className="w-4 h-4 mr-2" /> Weniger lesen
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="pt-4">
                        <p className="text-muted-foreground text-lg leading-relaxed line-clamp-3 mb-6">
                          {article.content}
                        </p>
                        <Button 
                          className="w-full rounded-2xl h-14 text-lg font-bold group shadow-lg shadow-primary/20"
                          onClick={() => setExpandedId(article.id)}
                        >
                          Weiterlesen <ChevronDown className="w-4 h-4 ml-2 group-hover:translate-y-1 transition-transform" />
                        </Button>
                      </div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
