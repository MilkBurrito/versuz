"use client";

// Explore: Campaigns (grid → detail) · Browse (book → chapter → verse) ·
// Search (reference or keyword). Every add path picks a translation (§7).

import { useEffect, useState } from "react";
import { GAME } from "@/config/game";
import type { CampaignDef } from "@/data/types";
import { BOOKS } from "@/lib/bible/books.generated";
import { searchVerseText } from "@/lib/bible/client";
import { parseRefQuery } from "@/lib/bible/searchRef";
import { levelFromXp } from "@/lib/engine/mastery";
import { playerLevelFromXp } from "@/lib/engine/playerLevel";
import { bookDisplayName, displayRef } from "@/lib/refs";
import { useApp } from "@/state/store";
import { BottomNav } from "@/components/ui/BottomNav";
import { LockIcon, PixelIcon } from "@/components/ui/icons";
import { AddVerseSheet } from "@/components/explore/AddVerseSheet";
import { AuthScreen } from "@/components/screens/AuthScreen";
import { CampaignDetail } from "@/components/explore/CampaignDetail";
import { MatchScreen } from "@/components/match/MatchScreen";

type Tab = "campaigns" | "browse" | "search";

export default function ExplorePage() {
  const { ready, authRequired, snapshot, match, init } = useApp();
  const [tab, setTab] = useState<Tab>("campaigns");
  const [detail, setDetail] = useState<CampaignDef | null>(null);
  const [addSheet, setAddSheet] = useState<string | null>(null);

  useEffect(() => {
    void init();
  }, [init]);

  if (ready && authRequired) return <AuthScreen />;
  if (!ready || !snapshot) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-cream">
        <p className="text-sm font-bold text-ink-faint">Loading…</p>
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <div className="mx-auto w-full max-w-md flex-1">
        {/* tabs */}
        <div className="flex border-b border-black/5 bg-white">
          {(
            [
              ["campaigns", "Settlements"],
              ["browse", "Browse"],
              ["search", "Search"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-3 text-[12px] font-extrabold uppercase tracking-wide ${
                tab === id ? "border-b-2 border-gold-deep text-gold-deep" : "text-ink-faint"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "campaigns" && <CampaignsTab onOpen={setDetail} />}
        {tab === "browse" && <BrowseTab onPick={setAddSheet} />}
        {tab === "search" && <SearchTab onPick={setAddSheet} />}
      </div>
      <BottomNav />

      {detail && <CampaignDetail campaign={detail} onClose={() => setDetail(null)} />}
      {addSheet && <AddVerseSheet verseId={addSheet} onClose={() => setAddSheet(null)} />}
      {match && <MatchScreen match={match} />}
    </div>
  );
}

// --- Campaigns ---

function CampaignsTab({ onOpen }: { onOpen: (c: CampaignDef) => void }) {
  const { snapshot } = useApp();
  if (!snapshot) return null;
  const playerLevel = playerLevelFromXp(snapshot.user.playerXp);
  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {[...snapshot.campaigns]
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((c) => {
          const tiles = snapshot.tiles.filter((t) => t.addedFromCampaignId === c.id);
          const atL3 = c.verseIds.filter((vid) => {
            const t = tiles.find((x) => x.verseId === vid);
            return t && levelFromXp(t.verseXp, t.masteryGoal) >= GAME.boss.UNLOCK_MIN_LEVEL;
          }).length;
          const locked = playerLevel < c.requiredPlayerLevel;
          const status = snapshot.userCampaigns.find((u) => u.campaignId === c.id)?.status;
          return (
            <button
              key={c.id}
              onClick={() => onOpen(c)}
              className="flex flex-col items-center gap-1.5 rounded-3xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.07)] transition-transform active:scale-[0.97]"
            >
              <div className={locked ? "opacity-40 grayscale" : ""}>
                <PixelIcon name={`badge-${c.theme}`} size={56} alt="" />
              </div>
              <span className="text-[14px] font-extrabold text-ink">{c.name}</span>
              {locked ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-ink-faint">
                  <LockIcon size={11} /> Player Level {c.requiredPlayerLevel}
                </span>
              ) : status === "cleared" || status === "mastered" ? (
                <span className="rounded-full bg-gold-wash px-2.5 py-0.5 text-[10px] font-extrabold text-gold-deep">
                  ✓ cleared
                </span>
              ) : (
                <span className="text-[10px] font-bold text-ink-faint">
                  {atL3}/{c.verseIds.length} at L{GAME.boss.UNLOCK_MIN_LEVEL}+
                </span>
              )}
            </button>
          );
        })}
    </div>
  );
}

// --- Browse: book → chapter → verse ---

function BrowseTab({ onPick }: { onPick: (verseId: string) => void }) {
  const [book, setBook] = useState<string | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const selected = BOOKS.find((b) => b.code === book);

  if (!selected) {
    return (
      <div className="p-4">
        {(["OT", "NT"] as const).map((testament) => (
          <div key={testament}>
            <h3 className="mb-2 mt-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
              {testament === "OT" ? "Old Testament" : "New Testament"}
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {BOOKS.filter((b) => b.testament === testament).map((b) => (
                <button
                  key={b.code}
                  onClick={() => setBook(b.code)}
                  className="rounded-xl bg-white px-3 py-2.5 text-left text-[13px] font-bold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:bg-shell"
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (chapter === null) {
    return (
      <div className="p-4">
        <Crumb onBack={() => setBook(null)} label={selected.name} />
        <div className="grid grid-cols-6 gap-1.5">
          {selected.versesPerChapter.map((_, i) => (
            <button
              key={i}
              onClick={() => setChapter(i + 1)}
              className="rounded-xl bg-white py-2.5 text-[14px] font-bold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:bg-shell"
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const verseCount = selected.versesPerChapter[chapter - 1] ?? 0;
  return (
    <div className="p-4">
      <Crumb onBack={() => setChapter(null)} label={`${bookDisplayName(selected.code)} ${chapter}`} />
      <div className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: verseCount }, (_, i) => i + 1).map((v) => (
          <button
            key={v}
            onClick={() => onPick(`${selected.code}.${chapter}.${v}`)}
            className="rounded-xl bg-white py-2.5 text-[14px] font-bold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:bg-shell"
          >
            {v}
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-[11px] font-bold text-ink-faint">
        Tap a verse to preview and add — ranges via the tile&apos;s &ldquo;Edit verse range&rdquo; after adding.
      </p>
    </div>
  );
}

function Crumb({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <button onClick={onBack} className="mb-3 flex items-center gap-2 text-[13px] font-extrabold text-ink">
      <span className="text-ink-faint">←</span> {label}
    </button>
  );
}

// --- Search: reference or keyword ---

function SearchTab({ onPick }: { onPick: (verseId: string) => void }) {
  const { snapshot } = useApp();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; text: string | null }[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  async function run() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearched(true);
    try {
      const asRef = parseRefQuery(q);
      if (asRef) {
        setResults(asRef.ids.slice(0, 40).map((id) => ({ id, text: null })));
      } else {
        const hits = await searchVerseText(q, snapshot?.user.defaultTranslation ?? "KJV");
        setResults(hits);
      }
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="p-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="John 3:16, Isaiah 43:18-19, or a phrase…"
          className="flex-1 rounded-2xl border-2 border-shell-deep/40 bg-white px-4 py-3 text-[14px] outline-none focus:border-gold"
        />
        <button
          onClick={run}
          disabled={searching || !query.trim()}
          className="rounded-2xl bg-ink px-4 text-[13px] font-extrabold text-white disabled:opacity-40"
        >
          Go
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        {searched && !searching && results.length === 0 && (
          <p className="py-6 text-center text-[12px] font-bold text-ink-faint">
            Nothing found — try a reference like &ldquo;Psalm 46:1&rdquo; or a phrase.
          </p>
        )}
        {results.map((r) => (
          <button
            key={r.id}
            onClick={() => onPick(r.id)}
            className="rounded-2xl bg-white px-4 py-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:bg-shell"
          >
            <span className="text-[13px] font-extrabold text-ink">{displayRef(r.id)}</span>
            {r.text && (
              <span className="mt-0.5 block truncate font-serif text-[13px] text-ink-soft">
                {r.text}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
