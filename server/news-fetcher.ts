import Parser from "rss-parser";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import { articles } from "../shared/schema.js";

if (!process.env.DATABASE_URL) {
  console.error("[News-Fetcher] DATABASE_URL fehlt – Abbruch.");
  process.exit(1);
}

// Pool mit Error-Handler damit keine unbehandelten Fehler entstehen
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.on("error", (err) => {
  console.error("[News-Fetcher] Datenbankverbindungsfehler:", err.message);
});

const db = drizzle(pool);

type FeedItem = {
  title?: string;
  link?: string;
  contentSnippet?: string;
  content?: string;
  summary?: string;
  enclosure?: { url?: string };
  "media:content"?: { $?: { url?: string } };
  "media:thumbnail"?: { $?: { url?: string } };
  itunes?: { image?: string };
};

const rssParser = new Parser<Record<string, unknown>, FeedItem>({
  customFields: {
    item: [
      ["media:content", "media:content"],
      ["media:thumbnail", "media:thumbnail"],
      ["enclosure", "enclosure"],
    ],
  },
  timeout: 20000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; VoiceUpBot/1.0)",
  },
});

// RSS-Quellen: über Google News erreichbar (zuverlässig)
const QUELLEN = [
  {
    name: "Welt",
    url: "https://news.google.com/rss/search?q=site:welt.de+Politik+Deutschland&hl=de&gl=DE&ceid=DE:de",
  },
  {
    name: "ZDF heute",
    url: "https://news.google.com/rss/search?q=site:zdf.de+Nachrichten&hl=de&gl=DE&ceid=DE:de",
  },
  {
    name: "Süddeutsche Zeitung",
    url: "https://news.google.com/rss/search?q=site:sueddeutsche.de+Politik&hl=de&gl=DE&ceid=DE:de",
  },
  {
    name: "Tagesschau",
    url: "https://www.tagesschau.de/xml/rss2",
  },
];

const INTERVALL_MS = 4 * 60 * 60 * 1000; // alle 4 Stunden

function bildUrlExtrahieren(item: FeedItem): string | null {
  if (item["media:content"]?.$?.url) return item["media:content"]!.$!.url!;
  if (item["media:thumbnail"]?.$?.url) return item["media:thumbnail"]!.$!.url!;
  if (item.enclosure?.url) return item.enclosure.url;
  if (item.itunes?.image) return item.itunes.image;
  return null;
}

function textBereinigen(roh: string): string {
  return roh
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 600);
}

async function artikelSpeichern(
  item: FeedItem,
  quellName: string
): Promise<boolean> {
  if (!item.title || !item.link) return false;

  // Duplikat-Prüfung
  const vorhandener = await db
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.sourceurl, item.link))
    .limit(1);

  if (vorhandener.length > 0) return false;

  const rohText = item.contentSnippet ?? item.content ?? item.summary ?? "";
  const zusammenfassung = textBereinigen(rohText);
  const bild = bildUrlExtrahieren(item);

  await db.insert(articles).values({
    title: item.title.trim(),
    summary: zusammenfassung || null,
    content: zusammenfassung || item.title.trim(),
    type: "news",
    source: quellName,
    sourceurl: item.link,
    imageurl: bild,
  });

  return true;
}

async function quelleAbrufen(
  name: string,
  url: string
): Promise<{ neu: number; geprueft: number }> {
  // 1. RSS-Feed abrufen (eigener try/catch)
  let items: FeedItem[];
  try {
    const feed = await rssParser.parseURL(url);
    items = feed.items.slice(0, 15);
  } catch (rssErr) {
    const meldung = rssErr instanceof Error ? rssErr.message : String(rssErr);
    console.error(`  ✗ RSS-Fehler bei "${name}": ${meldung}`);
    return { neu: 0, geprueft: 0 };
  }

  // 2. Artikel in DB speichern (eigener try/catch)
  let neu = 0;
  for (const item of items) {
    try {
      const gespeichert = await artikelSpeichern(item, name);
      if (gespeichert) {
        neu++;
        console.log(
          `    + "${(item.title ?? "").substring(0, 65)}"`
        );
      }
    } catch (dbErr) {
      const meldung = dbErr instanceof Error ? dbErr.message : String(dbErr);
      console.error(`  ✗ DB-Fehler bei "${name}": ${meldung}`);
      // Weiter mit dem nächsten Artikel
    }
  }

  return { neu, geprueft: items.length };
}

async function nachrichtenAbrufen(): Promise<void> {
  console.log(
    `\n[${new Date().toISOString()}] Nachrichtenabruf gestartet (${QUELLEN.length} Quellen)...`
  );

  let gesamtNeu = 0;

  for (const quelle of QUELLEN) {
    console.log(`  → ${quelle.name}`);
    const { neu, geprueft } = await quelleAbrufen(quelle.name, quelle.url);
    console.log(`  ✓ ${quelle.name}: ${neu} neu / ${geprueft} geprüft`);
    gesamtNeu += neu;
  }

  console.log(
    `[${new Date().toISOString()}] Fertig: ${gesamtNeu} neue Artikel. Nächster Abruf in 4 Stunden.`
  );
}

async function main(): Promise<void> {
  console.log("==============================================");
  console.log("  VoiceUp News-Fetcher gestartet");
  console.log(`  Quellen: ${QUELLEN.map((q) => q.name).join(", ")}`);
  console.log("  Intervall: alle 4 Stunden");
  console.log("==============================================\n");

  // Sofort beim Start und danach alle 4 Stunden
  while (true) {
    try {
      await nachrichtenAbrufen();
    } catch (err) {
      console.error(
        "Unerwarteter Fehler:",
        err instanceof Error ? err.message : err
      );
    }
    await new Promise<void>((resolve) =>
      setTimeout(resolve, INTERVALL_MS)
    );
  }
}

main().catch((err) => {
  console.error("Fataler Fehler:", err);
  process.exit(1);
});
