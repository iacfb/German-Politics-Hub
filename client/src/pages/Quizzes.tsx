import { Layout } from "@/components/Layout";
import { useQuizzes } from "@/hooks/use-quizzes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Quizzes() {
  const { data: quizzes, isLoading, error } = useQuizzes();

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">Wahl-O-Mat</h1>
          <p className="text-muted-foreground text-lg">Vergleiche deine Standpunkte mit den Programmen der Parteien.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes?.map((quiz) => (
            <Card key={quiz.id} className="flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
              {quiz.imageUrl && (
                <div className="h-48 overflow-hidden rounded-t-xl">
                  <img 
                    src={quiz.imageUrl} 
                    alt={quiz.title} 
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <Badge variant="outline" className="capitalize">
                    {quiz.category === 'landtag2026' ? 'Landtagswahl 2026' : quiz.category}
                  </Badge>
                </div>
                <CardTitle className="mt-2 text-xl">{quiz.title}</CardTitle>
                <CardDescription className="line-clamp-2">{quiz.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1" />
              <CardFooter>
                <Link href={`/quizzes/${quiz.id}`} className="w-full">
                  <Button className="w-full">Quiz starten</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
