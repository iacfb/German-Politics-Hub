import { Layout } from "@/components/Layout";
import { useArticles } from "@/hooks/use-articles";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function News() {
  const { data: articles, isLoading } = useArticles();

  if (isLoading) return (
    <Layout>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-80 w-full rounded-2xl" />)}
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">Aktuelle Themen</h1>
          <p className="text-muted-foreground text-lg">Hintergründe, Analysen und Möglichkeiten zur Partizipation.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles?.map((article) => (
            <Card key={article.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 group border-border/50 flex flex-col">
              {article.imageUrl && (
                <div className="h-48 overflow-hidden">
                  <img 
                    src={article.imageUrl} 
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex justify-between items-center mb-2">
                  <Badge variant={article.type === 'project' ? "default" : "secondary"}>
                    {article.type === 'project' ? 'Projekt' : 'Nachricht'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {article.source || 'VoiceUp'} • {format(new Date(article.createdAt), 'dd. MMM yyyy', { locale: de })}
                  </span>
                </div>
                <CardTitle className="leading-tight group-hover:text-primary transition-colors">
                  {article.title}
                </CardTitle>
                {article.summary && (
                  <CardDescription className="text-primary font-medium mt-2">
                    {article.summary}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-muted-foreground text-sm line-clamp-4">
                  {article.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
