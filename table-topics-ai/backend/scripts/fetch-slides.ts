/**
 * Builds the slide deck for "Presentación aleatoria" from Wikimedia Commons:
 * for each wishlist entry it searches Commons, keeps the first freely-licensed
 * bitmap (CC0 / public domain / CC BY / CC BY-SA), downloads a 1280px render
 * to frontend/public/slides/<id>.jpg and writes shared/slides.json with the
 * caption, Jev description and attribution. Idempotent per id.
 *
 *   pnpm content:slides            # fill in missing slides
 *   pnpm content:slides --redo id  # re-fetch one id with the next candidate
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { SLIDE_WISHLIST } from "./slides-wishlist";

const OUT = resolve(import.meta.dirname, "../../frontend/public/slides");
const MANIFEST = resolve(import.meta.dirname, "../../shared/slides.json");
const UA = "table-topics-ai/1.0 (toastmasters game night; esteban93torres@gmail.com)";
mkdirSync(OUT, { recursive: true });

export interface SlideMeta {
  id: string;
  caption: string;
  description: string;
  file: string;
  width: number;
  height: number;
  credit: { title: string; artist: string; license: string; url: string };
  /** Index of the search result used (for --redo). */
  pick: number;
}

const OK_LICENSE = /^(CC0|Public domain|CC BY(-SA)? \d|CC BY(-SA)?$|CC-BY(-SA)?)/i;

interface CommonsPage {
  title: string;
  imageinfo?: {
    width: number;
    height: number;
    mime: string;
    thumburl: string;
    thumbwidth: number;
    thumbheight: number;
    descriptionurl: string;
    extmetadata?: Record<string, { value: string }>;
  }[];
}

async function search(query: string): Promise<CommonsPage[]> {
  const params = new URLSearchParams({
    action: "query", format: "json", generator: "search",
    gsrsearch: `filetype:bitmap ${query}`, gsrnamespace: "6", gsrlimit: "12",
    prop: "imageinfo", iiprop: "url|extmetadata|size|mime", iiurlwidth: "1280",
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Commons HTTP ${res.status}`);
  const data = (await res.json()) as { query?: { pages?: Record<string, CommonsPage & { index: number }> } };
  return Object.values(data.query?.pages ?? {}).sort((a, b) => a.index - b.index);
}

function strip(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

async function main() {
  const redo = process.argv.includes("--redo") ? process.argv[process.argv.indexOf("--redo") + 1] : null;
  const manifest: SlideMeta[] = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : [];
  const byId = new Map(manifest.map((m) => [m.id, m]));

  for (const wish of SLIDE_WISHLIST) {
    const existing = byId.get(wish.id);
    if (existing && wish.id !== redo && existsSync(resolve(OUT, existing.file))) continue;
    const startAt = wish.id === redo && existing ? existing.pick + 1 : 0;
    process.stdout.write(`${wish.id.padEnd(14)} "${wish.query}" … `);
    try {
      const pages = await search(wish.query);
      let chosen: { page: CommonsPage; pick: number } | null = null;
      for (let i = startAt; i < pages.length; i++) {
        const info = pages[i].imageinfo?.[0];
        if (!info) continue;
        const license = info.extmetadata?.LicenseShortName?.value ?? "";
        if (!OK_LICENSE.test(license)) continue;
        if (!/^image\/(jpeg|png)$/.test(info.mime)) continue;
        if (info.width < 900 || info.height < 600) continue;
        if (info.width / info.height < 0.9) continue; // skip tall portraits; projector is 16:9
        chosen = { page: pages[i], pick: i };
        break;
      }
      if (!chosen) {
        console.log("no suitable result");
        continue;
      }
      const info = chosen.page.imageinfo![0];
      const img = await fetch(info.thumburl, { headers: { "User-Agent": UA } });
      if (!img.ok) throw new Error(`image HTTP ${img.status}`);
      const file = `${wish.id}.jpg`;
      writeFileSync(resolve(OUT, file), Buffer.from(await img.arrayBuffer()));
      const meta: SlideMeta = {
        id: wish.id, caption: wish.caption, description: wish.description, file,
        width: info.thumbwidth, height: info.thumbheight,
        credit: {
          title: chosen.page.title.replace(/^File:/, ""),
          artist: strip(info.extmetadata?.Artist?.value ?? "desconocido"),
          license: info.extmetadata?.LicenseShortName?.value ?? "",
          url: info.descriptionurl,
        },
        pick: chosen.pick,
      };
      byId.set(wish.id, meta);
      console.log(`ok  [${meta.credit.license}] ${meta.credit.title.slice(0, 50)}`);
    } catch (err) {
      console.log(`FAILED: ${(err as Error).message}`);
    }
    // Stay polite with the Commons API.
    await new Promise((r) => setTimeout(r, 250));
  }

  const ordered = SLIDE_WISHLIST.map((w) => byId.get(w.id)).filter((m): m is SlideMeta => !!m);
  writeFileSync(MANIFEST, JSON.stringify(ordered, null, 2) + "\n");
  console.log(`\n${ordered.length}/${SLIDE_WISHLIST.length} slides in manifest`);
}
main();
