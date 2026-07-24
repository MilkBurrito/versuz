// ============================================================================
// THE KINGDOM'S VOICE — every player-facing string, in one place.
// Source of truth: "Versuz — Lore & Naming Glossary.md" + the seven Axioms.
//
// Voice principles (glossary): warm, near, unhurried · faithfulness over
// greatness · failure is invitation, never punishment · Darkness is hollow,
// not cool · every gift is first received.
//
// Canonical terms: the King · the Kingdom · the Great Tree · the Everflame ·
// the Temple · the King's Guard · the (living) Sword · Darkness · the Forge.
// Proposed terms applied here (flagged for Alex's sign-off in the glossary):
// Stand (a real match) · Waystation (training grounds) · Pell (dummy) ·
// the Hollow (enemies) · Stronghold (boss) · Faithfulness (XP) · Vigil
// (streak) · Embers (currency) · Lantern (energy — from Axiom VI: the Guard
// bring their lanterns to the Everflame) · Counsel (hints) · Provisions
// (settings) · Your Standing (profile) · Settlements (explore/campaigns) ·
// Deeds Remembered (badges) · Grace (streak freeze).
// ============================================================================

export const LORE = {
  terms: {
    faithfulness: "Faithfulness", // XP
    embers: "Embers", // currency
    lantern: "Lantern", // energy
    vigil: "Vigil", // streak
    stand: "Stand", // a real match (SRS review)
    counsel: "Counsel", // hint
    stronghold: "Stronghold", // boss
    hollow: "the Hollow", // enemies collectively
    rank: "Rank", // player level
  },

  nav: {
    home: "Kingdom",
    explore: "Settlements",
    shop: "Forge",
    settings: "Provisions",
  },

  status: {
    vigil: "vigil",
    embers: "embers",
    lantern: "lantern",
    lanternEta: (eta: string) => `lantern · +1 in ${eta}`,
  },

  home: {
    versesHeading: "Your Sword's Edges",
    empty:
      "Your Sword has no edge yet. Walk to the Settlements and take up your first verse — the King is already speaking.",
    waystation: "The Waystation",
    waystationSub: "Rest. Train. Nothing is at stake.",
  },

  preMatch: {
    start: (xp: number) => `Take Your Stand · +${xp}`,
    lanternSpent: (eta: string | null) =>
      eta ? `Your lantern is spent · +1 in ${eta}` : "Your lantern is spent",
    mastered: "A living edge",
    progress: (level: number, xp: number, goal: number) =>
      `Sharpness ${level} · ${xp} / ${goal} faithfulness to a living edge`,
    deleteTitle: (ref: string) => `Lay down ${ref}?`,
    deleteBody:
      "This edge and its sharpening are laid down. The verse remains in the Settlements, whenever you return for it.",
    deleteAction: "Lay it down",
    switchTitle: (to: string) => `Reforge in ${to}?`,
    switchBody:
      "New words mean a new edge — sharpening begins again from the start. To keep both, take the verse up again in the other translation instead.",
    switchAction: "Reforge",
    editRange: "✎ Reforge the verse range",
    loading: "Unrolling the scroll…",
  },

  match: {
    exitTitle: "Withdraw?",
    exitBody: "The Stand is lost and your lantern's light already spent. The Darkness keeps nothing you've memorized.",
    exitStay: "Hold the line",
    exitLeave: "Withdraw",
    counsel: "Counsel",
    counselTitle: (cost: number) => `The King is already speaking (−${cost} lantern)`,
    counselEmpty: "Your lantern is spent",
    finisherLabel: "Finishing blow",
    finisherPrompt: "Name the verse — the Sword answers to its true name.",
    firstLetterHelp: "Type each whole word — space jumps forward, backspace hops back.",
    fadingHelp: "Read it — the words fade in a moment…",
    rapidWrong: "Not quite — small stumbles are forgiven, missing words are not.",
    rapidNext: "The next word:",
    spotHelp: "Darkness swapped two words — it can only corrupt, never write. Tap them both to set it right.",
  },

  postMatch: {
    victoryTitle: "The Darkness gave way.",
    victorySub: "The Word did the work.",
    bossVictoryTitle: (name: string) => `${name} falls.`,
    bossVictorySub: "The Stronghold is broken.",
    flawless: "✦ flawless",
    faithfulnessEarned: "Faithfulness",
    lossTitle: "The Hollow held its ground.",
    bossLossTitle: (name: string) => `${name} holds the Stronghold — for now.`,
    lossSub: "The Sword did not answer this time. Be still — and return.",
    lossConsolation: (xp: number) => `+${xp} faithfulness — you stood anyway`,
    lossNoMastery: "No sharpening this time.",
    vigilKept: "The Vigil holds ✓",
    retry: "Stand again",
    home: "The Kingdom",
    vigilSecured: "The flame is kept for tonight.",
    vigilDay: (n: number) => `Night ${n} of the Vigil`,
    tapToContinue: "walk on",
    chestDropped: "A gift from the Kingdom",
    chestOpen: "Receive it",
  },

  screens: {
    vigil: {
      title: "The Vigil",
      subtitle: "Nights kept beside the Everflame",
      unit: (n: number) => (n === 1 ? "night kept" : "nights kept"),
      longest: "Longest vigil",
      grace: "Weekly grace",
      graceReady: "Covers you",
      graceUsed: "Spent this week",
      today: "Tonight",
      todaySecured: "Kept ✓",
      todayPending: "One Stand keeps the flame",
      how: [
        "Take one Stand a day — win or lose, the flame holds. Withdrawing early does not count.",
        "Miss a night and grace covers it, once a week, before the flame goes out.",
        "The flame can be hidden in Provisions if the counting weighs on you.",
      ],
    },
    embers: {
      title: "Embers",
      subtitle: "Gathered from the Everflame — every gift is first received",
      unit: "embers carried",
      earnHeading: "How they are given",
      win: "Stand and prevail",
      loss: "Stand and fall (you stood)",
      spendHeading: "Bringing them to the Forge",
      spendBody:
        "The Forge is not yet lit — your embers keep until it is. Meanwhile, arms and gear are given for breaking Strongholds, rising in rank, and faithfulness kept.",
      peek: "Look in on the Forge",
    },
    lantern: {
      title: "Your Lantern",
      subtitle: "Light carried into the dark",
      full: "Burning full — carry it out",
      next: (eta: string) => `+1 flame in ${eta}`,
      rulesHeading: "How it burns",
      costLabel: "Taking a Stand burns",
      costValue: (n: number) => `${n} flame`,
      sameCost: "Long or short verse — the same light",
      regen: (h: number) => `The Everflame rekindles +1 every ~${h}h`,
      refill: "Empty to full — about a day",
      notes: [
        "The flame burns whether you prevail or fall — it is the cost of going out at all.",
        "With no flame you may still read, add, and walk the Settlements; only Stands wait for the fire.",
        "A living edge takes more faithfulness than one day's flames can give a single verse — return across days; that is how the Kingdom advances.",
      ],
    },
    standing: {
      title: "Your Standing",
      subtitle: "In the King's Guard",
      deeds: "Deeds Remembered",
      mastered: "Living edges",
      changeCharacter: "Change your Guard",
    },
    provisions: {
      title: "Provisions",
    },
  },

  waystation: {
    title: "The Waystation",
    subtitle: "A rest within the King's territory",
    intro:
      "Here the Guard keep their Swords sharp in the quiet. The Pell is only wood — nothing is spent, nothing is counted, nothing is at stake.",
    pell: "The Pell",
    chooseVerse: "Choose an edge to sharpen",
    anyVerse: "Let the Pell choose",
    drill: "Train",
    again: "Again",
    leave: "Back to the Kingdom",
    noVerses:
      "The Pell waits for a Guard with an edge to sharpen. Take up a verse in the Settlements first — new words are learned at the Stand, not here.",
    accuracy: "Strikes true",
    empty: "Nothing is earned here — and nothing is lost. That is the point.",
    solved: "A clean strike.",
  },

  onboarding: {
    steps: [
      {
        title: "The Temple gates",
        body: "You arrive at dusk. Inside, the Everflame burns as it always has, and the King — who is alive, and near — is already speaking. You have been called to His Guard.",
      },
      {
        title: "Receive your Sword",
        body: "It is not steel alone. The Sword is living, because the King's own Word dwells within it. Scholars have tried to forge its equal and failed — they mistook the vessel for the life it carries.",
      },
      {
        title: "Wield it by heart",
        body: "The Sword answers to memory. Hide the Word in your heart, and when the Darkness presses in, the blade will speak. Take up your first verse in the Settlements — and take your Stand.",
      },
    ],
    cta: "Enter the Kingdom",
    next: "Walk on",
  },

  errors: {
    verseLoad:
      "The scroll would not unroll. Be still a moment, then try again — the Word has not gone anywhere.",
    generic: "Something in the dark got in the way. It cannot keep you out — try again.",
    authFailed: "The gate did not open. Check your name and word of passage, and try again.",
  },

  auth: {
    tagline: "Battle the dark with the Word.",
    footer: "Your Sword and your Standing follow you — any gate, any land.",
    signIn: "Enter",
    createAccount: "Join the Guard",
    checkEmail: "Nearly sworn in — a letter is on its way. Confirm it, then enter.",
  },
} as const;
