/**
 * Downloads the Kevin MacLeod tracks listed in shared/music.ts from
 * incompetech.com and trims each to a loopable 90 s clip (fade in/out,
 * 64 kbps mono so the screen can preload the whole set) in frontend/public/music. Idempotent: existing files are skipped.
 *
 *   pnpm content:music
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { MUSIC } from "../../shared/music";

const OUT = resolve(import.meta.dirname, "../../frontend/public/music");
const BASE = "https://incompetech.com/music/royalty-free/mp3-royaltyfree/";
const CLIP_SECONDS = 90;
mkdirSync(OUT, { recursive: true });

async function main() {
  let ok = 0;
  let failed = 0;
  for (const [mood, tracks] of Object.entries(MUSIC)) {
    for (const t of tracks) {
      const dest = resolve(OUT, t.file);
      if (existsSync(dest) && statSync(dest).size > 100_000) {
        ok++;
        continue;
      }
      const url = BASE + encodeURIComponent(t.source);
      process.stdout.write(`[${mood}] ${t.title} … `);
      try {
        const res = await fetch(url, { headers: { "User-Agent": "table-topics-ai/1.0" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        const tmp = dest + ".orig.mp3";
        writeFileSync(tmp, buf);
        execFileSync("ffmpeg", [
          "-y", "-loglevel", "error", "-i", tmp,
          "-t", String(CLIP_SECONDS),
          "-af", `afade=t=in:st=0:d=1.5,afade=t=out:st=${CLIP_SECONDS - 2.5}:d=2.5,loudnorm=I=-18:TP=-1.5:LRA=11`,
          "-map_metadata", "-1", "-ac", "1", "-ar", "44100", "-b:a", "64k", dest,
        ]);
        unlinkSync(tmp);
        console.log(`ok (${(statSync(dest).size / 1e6).toFixed(1)} MB)`);
        ok++;
      } catch (err) {
        failed++;
        console.log(`FAILED: ${(err as Error).message}`);
      }
    }
  }
  console.log(`\n${ok} tracks ready, ${failed} failed`);
  if (failed) process.exit(1);
}
main();
