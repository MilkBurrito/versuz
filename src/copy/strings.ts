// ============================================================================
// UI COPY — every player-facing string in one place, so wording stays
// consistent and editable without hunting through components.
//
// PLAIN LANGUAGE IS THE RULE. A first-time user should never have to learn
// vocabulary to use the app: Home, Explore, Shop, Settings, streak, energy,
// XP, level, hint, boss, badges. The world's flavor lives in the art, the
// story beats (onboarding), and the writing's warmth — not in renaming the
// furniture. The one deliberate exception is **Embers** for the currency.
// ============================================================================

export const TEXT = {
  nav: {
    home: "Home",
    explore: "Explore",
    shop: "Shop",
    settings: "Settings",
  },

  status: {
    streak: "streak",
    embers: "embers",
    energy: "energy",
    energyEta: (eta: string) => `energy · +1 in ${eta}`,
  },

  home: {
    versesHeading: "Your Verses",
    empty: "No verses yet. Head to Explore and add your first one.",
    trainingDummy: "Training Ground",
    character: "Your character",
  },

  preMatch: {
    /** The real match (spends energy, awards XP). "Practice" now belongs to
        the Training Ground, so this reads as the fight it is. */
    start: (xp: number) => `Battle · +${xp} XP`,
    noEnergy: (eta: string | null) => (eta ? `No energy · +1 in ${eta}` : "No energy"),
    mastered: "Mastered",
    progress: (level: number, xp: number, goal: number) =>
      `Level ${level} · ${xp} / ${goal} XP to mastery`,
    deleteTitle: (ref: string) => `Delete ${ref}?`,
    deleteBody: "This tile and its progress are removed. The verse stays in Explore.",
    deleteAction: "Delete",
    switchTitle: (to: string) => `Switch to ${to}?`,
    switchBody:
      "The words change with the translation, so this tile's progress resets to Level 1. To keep both, add the verse again in the other translation instead.",
    switchAction: "Switch",
    editRange: "✎ Edit verse range",
    loading: "Loading…",
  },

  match: {
    exitTitle: "Exit?",
    exitBody: "You'll lose this match. Energy is already spent.",
    exitStay: "Keep fighting",
    exitLeave: "Exit",
    hint: "Hint",
    hintTitle: (cost: number) => `Reveal the next answer (−${cost} energy)`,
    hintEmpty: "Out of energy",
    finisherLabel: "Finisher",
    finisherPrompt: "Finishing blow — name the verse.",
    firstLetterHelp: "Type each whole word — space jumps forward, backspace hops back.",
    fadingHelp: "Read it — the words fade in a moment…",
    rapidWrong: "Not quite — small typos are forgiven, missing words are not.",
    rapidNext: "Next word:",
    spotHelp: "Two words were swapped. Tap them both to swap them back.",
    spotHelpMany: (n: number) => `${n} words are out of place. Tap two to swap them.`,
    firstLetterPartialHelp: "Fill in the missing words — space jumps forward, backspace hops back.",
    letterRevealHelp: "Type the first letter of each missing word — it opens up.",
    phraseBankHelp: "Put the phrases back in order.",
    timerRemaining: (secs: number) => `${secs}s bonus`,
    timerLapsed: "no bonus",
  },

  postMatch: {
    victoryTitle: "Nailed it.",
    victorySub: "…somehow.",
    bossVictoryTitle: (name: string) => `${name} falls.`,
    bossVictorySub: "The Word did the work.",
    flawless: "✦ flawless",
    xpEarned: "XP earned",
    timerBonusRow: (n: number) => `Beat the clock ×${n}`,
    lossTitle: "The demon won that round.",
    bossLossTitle: (name: string) => `${name} held the field.`,
    lossSub: "Sharpen the blade and go again.",
    lossConsolation: (xp: number) => `+${xp} XP (player only)`,
    lossNoMastery: "No mastery progress this time.",
    streakKept: "Streak kept ✓",
    retry: "Retry",
    home: "Home",
    streakDay: (n: number) => `Day ${n} streak`,
    streakSecured: "Secured for today.",
    tapToContinue: "tap to continue",
    chestDropped: "A reward dropped",
    chestOpen: "Tap to open",
  },

  screens: {
    streak: {
      title: "Streak",
      subtitle: "One versuz a day keeps the lantern lit",
      unit: (n: number) => `day${n === 1 ? "" : "s"} in a row`,
      milestones: "Milestones",
      details: "Details",
      longest: "Longest streak",
      freeze: "Weekly freeze",
      freezeReady: "Ready",
      freezeUsed: "Used this week",
      today: "Today",
      todaySecured: "Secured ✓",
      todayPending: "1 versuz to keep it",
      howHeading: "How it works",
      how: [
        "Finish at least one versuz a day — win or lose, it counts. Walking out early doesn't.",
        "Miss a day and your free freeze covers you automatically, once per week.",
        "Streak visuals can be turned off in Settings if they stress you out.",
      ],
    },
    embers: {
      title: "Embers",
      subtitle: "Earned by showing up — spending comes later",
      unit: "banked embers",
      earnHeading: "How you earn them",
      win: "Win a versuz",
      loss: "Lose a versuz (you still showed up)",
      dailyQuests: "Daily quests",
      weeklyQuests: "Weekly quests",
      spendHeading: "Spending them",
      spendBody:
        "The Shop opens in a later update — your balance keeps growing until then. Meanwhile, weapons and gear unlock by clearing campaigns, leveling up, and finishing weekly quests.",
      peek: "Peek at the Shop",
    },
    energy: {
      title: "Energy",
      subtitle: "Your daily match budget",
      full: "Full — go spend it",
      next: (eta: string) => `+1 in ${eta}`,
      rulesHeading: "The rules",
      costLabel: "Starting a match costs",
      costValue: (n: number) => `${n} energy`,
      sameCostLabel: "Long or short verse",
      sameCostValue: "same cost",
      regenLabel: "Regenerates",
      regenValue: (h: number) => `+1 every ~${h}h`,
      refillLabel: "Empty to full",
      refillValue: "~24h",
      notesHeading: "Good to know",
      notes: [
        "Energy is spent win or lose — it's the cost of an attempt.",
        "At 0 you can still read, add, and browse verses; only matches wait.",
        "Mastery takes more XP than a day's energy can give one verse — spreading practice across days is the efficient path.",
      ],
    },
    profile: {
      title: "Profile",
      badges: "Badges",
      mastered: "Mastered verses",
      changeCharacter: "Change character",
    },
    settings: {
      title: "Settings",
      copyrightLabel: "Scripture copyright",
      copyrightHint: "Translations used, and their publishers",
      copyrightAction: "View",
    },
  },

  training: {
    title: "Training Ground",
    subtitle: "Practice freely — nothing is spent, nothing is scored",
    dummy: "Training Dummy",
    intro:
      "Drill any verse you've already learned against the training dummy. No energy, no XP, no effect on your review schedule.",
    chooseVerse: "Verse",
    anyVerse: "Surprise me",
    chooseGames: "Games",
    gamesHint: "Pick the games you want — the match is the usual length.",
    all: "All",
    none: "None",
    start: "Start training",
    startDisabled: "Pick at least one game",
    leave: "Back",
    quit: "End session",
    noVerses:
      "Nothing to drill yet. New verses are learned in a real match first — add one in Explore and battle it once, then it shows up here.",
    accuracy: "Accuracy",
    round: (i: number, n: number) => `${i} / ${n}`,
    doneTitle: "Session complete",
    doneSub: "Nothing was spent, nothing was scored — that's the point.",
    doneAccuracy: (pct: number) => `${pct}% of your first tries landed`,
    again: "Train again",
    change: "Change setup",
  },

  onboarding: {
    steps: [
      {
        title: "The Temple gates",
        body: "You arrive at dusk. Inside, the Everflame burns as it always has, and the King — who is alive, and near — is already speaking. You've been called to His Guard.",
      },
      {
        title: "Receive your Sword",
        body: "It isn't steel alone. The Sword is living, because the King's own Word dwells within it. Scholars have tried to forge its equal and failed — they mistook the vessel for the life it carries.",
      },
      {
        title: "Wield it by heart",
        body: "The Sword answers to memory. Learn a verse, and when the dark presses in, the blade will speak. Add your first verse in Explore — then go fight something.",
      },
    ],
    cta: "Get started",
    next: "Next",
  },

  errors: {
    verseLoad: "Couldn't load that verse. Give it a moment and try again.",
    generic: "Something went wrong. Try again.",
  },

  auth: {
    tagline: "Battle the dark with the Word.",
    footer: "Your verses and progress follow your account — any browser, anywhere.",
    signIn: "Sign in",
    createAccount: "Create account",
    checkEmail: "Almost in — check your email to confirm your account, then sign in.",
  },
} as const;
