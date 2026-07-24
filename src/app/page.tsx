"use client";

// Home hub (§13-B): status bar → nameplate + XP + the scene (character and
// training dummy, both tappable) →
// "Your Verses" (campaign cards with nested tiles, then standalones) → nav.
// The pre-match overlay and the match screen mount over this.

import { useEffect, useState } from "react";
import { useApp } from "@/state/store";
import { TEXT } from "@/copy/strings";
import { StatusBar, type StatusScreen } from "@/components/ui/StatusBar";
import { BottomNav } from "@/components/ui/BottomNav";
import { HeroDisplay } from "@/components/home/HeroDisplay";
import { CampaignCard } from "@/components/home/CampaignCard";
import { VerseTileRow } from "@/components/home/VerseTileRow";
import { PreMatchOverlay } from "@/components/overlay/PreMatchOverlay";
import { MatchScreen } from "@/components/match/MatchScreen";
import { AuthScreen } from "@/components/screens/AuthScreen";
import { CharacterScreen } from "@/components/screens/CharacterScreen";
import { EnergyScreen } from "@/components/screens/EnergyScreen";
import { GemsScreen } from "@/components/screens/GemsScreen";
import { OnboardingScreen } from "@/components/screens/OnboardingScreen";
import { ProfileScreen } from "@/components/screens/ProfileScreen";
import { StreakScreen } from "@/components/screens/StreakScreen";
import { TrainingGroundScreen } from "@/components/training/TrainingGroundScreen";

type HomeScreenName = StatusScreen | "character" | "training";

export default function HomePage() {
  const { ready, authRequired, snapshot, overlayTileId, match, init, openOverlay } = useApp();
  const [screen, setScreen] = useState<HomeScreenName | null>(null);

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

  const { user, tiles, campaigns, userCampaigns } = snapshot;
  const overlayTile = overlayTileId ? tiles.find((t) => t.id === overlayTileId) : null;

  // A campaign card appears ONLY when the whole campaign was added (every verse
  // holds a campaign-flagged tile). Mastered tiles stay inside the dropdown.
  // Once the campaign is MASTERED (all verses L7), it GRADUATES off Home —
  // its verses live in Profile's mastered list; the badge marks the journey.
  const masteredCampaignIds = new Set(
    userCampaigns.filter((c) => c.status === "mastered").map((c) => c.campaignId),
  );
  const completeCampaigns = campaigns
    .map((c) => ({ campaign: c, tiles: tiles.filter((t) => t.addedFromCampaignId === c.id) }))
    .filter(
      ({ campaign, tiles: ct }) =>
        !masteredCampaignIds.has(campaign.id) &&
        campaign.verseIds.every((vid) => ct.some((t) => t.verseId === vid)),
    )
    .sort((a, b) => a.campaign.displayOrder - b.campaign.displayOrder);
  const groupedTileIds = new Set(
    completeCampaigns.flatMap(({ tiles: ct }) => ct.map((t) => t.id)),
  );
  const standalone = tiles.filter(
    (t) =>
      !groupedTileIds.has(t.id) &&
      !(t.addedFromCampaignId !== null && masteredCampaignIds.has(t.addedFromCampaignId)),
  );

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <StatusBar user={user} onOpen={setScreen} />
      <main className="flex-1">
        <HeroDisplay
          user={user}
          onOpenCharacter={() => setScreen("character")}
          onOpenTraining={() => setScreen("training")}
        />

        <div className="mx-auto max-w-md px-4 pb-6">
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-shell-deep/40" />
            <h2 className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-ink-soft">
              {TEXT.home.versesHeading}
            </h2>
            <span className="h-px flex-1 bg-shell-deep/40" />
          </div>

          <div className="flex flex-col gap-3">
            {completeCampaigns.length === 0 && standalone.length === 0 && (
              <p className="px-4 py-6 text-center text-[13px] leading-relaxed text-ink-faint">
                {TEXT.home.empty}
              </p>
            )}
            {completeCampaigns.map(({ campaign, tiles: ctiles }) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                tiles={ctiles}
                onTileTap={openOverlay}
              />
            ))}
            {standalone.map((tile) => (
              <VerseTileRow key={tile.id} tile={tile} onTap={() => openOverlay(tile.id)} />
            ))}
          </div>

        </div>
      </main>
      <BottomNav />

      {screen === "profile" && (
        <ProfileScreen onClose={() => setScreen(null)} onChangeCharacter={() => setScreen("character")} />
      )}
      {screen === "streak" && <StreakScreen user={user} onClose={() => setScreen(null)} />}
      {screen === "gems" && <GemsScreen user={user} onClose={() => setScreen(null)} />}
      {screen === "energy" && <EnergyScreen user={user} onClose={() => setScreen(null)} />}
      {screen === "character" && <CharacterScreen onClose={() => setScreen(null)} />}
      {screen === "training" && <TrainingGroundScreen onClose={() => setScreen(null)} />}

      {overlayTile && <PreMatchOverlay tile={overlayTile} />}
      {match && <MatchScreen match={match} />}

      {/* First-run induction into the Guard — above everything until sworn in. */}
      {!user.onboardingCompleted && <OnboardingScreen />}
    </div>
  );
}
