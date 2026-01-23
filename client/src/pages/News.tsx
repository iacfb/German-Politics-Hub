import { Layout } from "@/components/Layout";
import { useArticles } from "@/hooks/use-articles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function News() {
  const { data: articles, isLoading } = useArticles();

  if (isLoading) return (
    <Layout>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-80 w-full rounded-2xl" />)}
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">Aktuelles</h1>
          <p className="text-muted-foreground text-lg">News and participatory projects.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles?.map((article) => (
            <Card key={article.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 group border-border/50">
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
                    {article.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(article.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
                <CardTitle className="leading-tight group-hover:text-primary transition-colors">
                  {article.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm line-clamp-3">
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
