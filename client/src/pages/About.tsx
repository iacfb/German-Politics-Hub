import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function About() {
  return (
    <Layout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-8"
      >
        <section className="space-y-4">
          <h1 className="text-4xl font-display font-bold text-foreground">Über uns</h1>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p className="text-xl text-muted-foreground leading-relaxed">
              Wir leben in einer Zeit, in der alles riesig wirkt: Informationen, politische Entscheidungen und gesellschaftliche Spannungen sind oft schwer greifbar. Viele Menschen möchten verstehen, was vor sich geht, doch verlässliches Wissen, ehrlicher Austausch und echte Beteiligung sind nicht immer leicht erreichbar. Genau da setzt unsere App an. Sie soll politische Bildung zugänglicher machen, Orientierung geben und jungen Leuten Werkzeuge an die Hand legen, mit denen sie ihrer eigenen Stimme mehr Gewicht verleihen.
            </p>
            
            <p className="text-lg leading-relaxed">
              Unsere Plattform vereint fünf zentrale Bausteine, die zusammen ein neues Netzwerk politischer Teilhabe bilden. Unter <strong>Aktuelle Themen & Partizipation</strong> erklären wir politische Entwicklungen verständlich und zeigen konkrete Möglichkeiten, wie man sich einbringen kann. Das <strong>Politik-Quiz</strong> hilft dabei, die eigene Haltung besser einzuordnen und politische Identität bewusster zu reflektieren. Mit dem <strong>KI-Dialogsystem</strong> gibt’s einen neutralen, niedrigschwelligen Raum für Gespräche über politische Fragen – perfekt, um Gedanken zu sortieren, Perspektiven zu entdecken und Wissen zu vertiefen. In <strong>Umfragen & Trends</strong> sammeln wir anonym Meinungen, machen Stimmungen sichtbar und zeigen, wie vielfältig politische Sichtweisen wirklich sind. Ergänzend gibt es Lern- und Orientierungsfunktionen, die Begriffe erklären, Zusammenhänge aufzeigen und den Einstieg in komplizierte Themen erleichtern. 
            </p>

            <div className="bg-muted/30 p-8 rounded-2xl border my-8">
              <h3 className="text-2xl font-bold mb-4">Meine Mission</h3>
              <p className="italic text-lg">
                "Meine Mission ist es, Politikbildung neu zu denken: interaktiv, verständlich und für alle zugänglich. Wir möchten dazu beitragen, dass mehr Menschen informierte Entscheidungen treffen, sich selbstbewusst einbringen und die Zukunft aktiv mitgestalten. Denn Demokratie lebt davon, dass jede Stimme zählt – und gehört wird – genau das ist mein Motto."
              </p>
              <p className="mt-4 font-bold text-primary">— Asin Celik, Schüler</p>
            </div>
          </div>
        </section>
        Kontakt: <a href="mailto:asin.celik@proton.me">asin.celik@proton.me</a>
      </motion.div>
    </Layout>
  );
}
