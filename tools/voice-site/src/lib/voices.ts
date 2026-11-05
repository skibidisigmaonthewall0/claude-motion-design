export type VoiceGender = "Female" | "Male" | "Neutral";

export type VoiceCategory = "Narration" | "Conversational" | "Character";

export type VoiceLanguage = "English" | "Russian" | "Other";

export type SampleLanguage = "English" | "Russian";

export const VOICE_LANGUAGES: Array<"English" | "Russian"> = ["English", "Russian"];

export interface Voice {
  id: string;
  name: string;
  gender: VoiceGender;
  language: VoiceLanguage;
  languageLabel?: string;
  accent: string;
  category: VoiceCategory;
  age: string;
  description: string;
  sample: string;
  sampleTranslation?: string;
  gradient: string;
  initials: string;
  flag: string;
  featured?: boolean;
  isLibrary?: boolean;
}

export interface PuterVoiceRecord {
  id?: string | number;
  name?: string;
  provider?: string;
  description?: string;
  category?: string;
  gender?: string;
  preview_url?: string;
  language?: { name?: string; code?: string } | string;
  labels?: Record<string, string>;
  supported_engines?: string[];
  supported_models?: string[];
}

export const VOICES: Voice[] = [
  /* -------------------------- English · current defaults -------------------------- */
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    gender: "Female",
    language: "English",
    accent: "American",
    category: "Narration",
    age: "Young adult",
    description: "Calm, clear and reassuring. The dependable narrator for explainers and e-learning.",
    sample: "Here's the thing about a good voice — it doesn't ask for your attention. It simply earns it.",
    gradient: "from-[#f7b267] via-[#e07a5f] to-[#8c3b4a]",
    initials: "RA",
    flag: "🇺🇸",
    featured: true,
  },
  {
    id: "9BWtsMINqrJLrRacOk9x",
    name: "Aria",
    gender: "Female",
    language: "English",
    accent: "American",
    category: "Narration",
    age: "Young adult",
    description: "Expressive and bright with a natural lift at the end of every sentence.",
    sample: "Some stories are meant to be whispered. This one, I think, is meant to be sung.",
    gradient: "from-[#f9a8d4] via-[#c084fc] to-[#6d28d9]",
    initials: "AR",
    flag: "🇺🇸",
    featured: true,
  },
  {
    id: "CwhRBWXzGAHq8TQ4Fs17",
    name: "Roger",
    gender: "Male",
    language: "English",
    accent: "American",
    category: "Conversational",
    age: "Middle aged",
    description: "Confident and grounded. Sounds like the smartest person in the room, without trying.",
    sample: "Let's keep this simple. You bring the idea, I'll bring the voice that makes people lean in.",
    gradient: "from-[#93c5fd] via-[#3b82f6] to-[#1e3a8a]",
    initials: "RO",
    flag: "🇺🇸",
    featured: true,
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Sarah",
    gender: "Female",
    language: "English",
    accent: "American",
    category: "Narration",
    age: "Young adult",
    description: "Soft, warm and intimate. Perfect for meditations, audiobooks and late-night radio.",
    sample: "Take a breath. Let the day loosen its grip. There is nowhere else you need to be right now.",
    gradient: "from-[#fbcfe8] via-[#f472b6] to-[#9d174d]",
    initials: "SA",
    flag: "🇺🇸",
  },
  {
    id: "FGY2WhTYpPnrIDTdsKH5",
    name: "Laura",
    gender: "Female",
    language: "English",
    accent: "American",
    category: "Conversational",
    age: "Young adult",
    description: "Upbeat and sunny. A natural fit for ads, social content and product tours.",
    sample: "Okay, this is the part where everything gets a whole lot easier. Ready? Let's go.",
    gradient: "from-[#fde68a] via-[#fb923c] to-[#c2410c]",
    initials: "LA",
    flag: "🇺🇸",
  },
  {
    id: "IKne3meq5aSn9XLyUdCD",
    name: "Charlie",
    gender: "Male",
    language: "English",
    accent: "Australian",
    category: "Conversational",
    age: "Young adult",
    description: "Relaxed and natural, with an easy Australian lilt. Great for podcasts and explainers.",
    sample: "Right, so here's the deal — no jargon, no fuss. Just a straight answer, mate.",
    gradient: "from-[#a7f3d0] via-[#34d399] to-[#065f46]",
    initials: "CH",
    flag: "🇦🇺",
  },
  {
    id: "JBFqnCBsd6RMkjVDRZzb",
    name: "George",
    gender: "Male",
    language: "English",
    accent: "British",
    category: "Narration",
    age: "Middle aged",
    description: "Warm, mature and unmistakably British. Documentary gold.",
    sample: "For a thousand years, the coastline has kept its secrets. Tonight, we finally listen.",
    gradient: "from-[#d6d3d1] via-[#a8a29e] to-[#44403c]",
    initials: "GE",
    flag: "🇬🇧",
  },
  {
    id: "N2lVS1w4EtoT3dr4eOWO",
    name: "Callum",
    gender: "Male",
    language: "English",
    accent: "Transatlantic",
    category: "Character",
    age: "Middle aged",
    description: "Raspy and intense. Built for trailers, villains and gritty narration.",
    sample: "You can run from the dark. But you cannot hide from what lives inside it.",
    gradient: "from-[#fca5a5] via-[#dc2626] to-[#450a0a]",
    initials: "CA",
    flag: "🇬🇧",
  },
  {
    id: "SAz9YHcvj6GT2YYXdXww",
    name: "River",
    gender: "Female",
    language: "English",
    accent: "American",
    category: "Conversational",
    age: "Young adult",
    description: "Calm, neutral and thoughtful. A safe pair of hands for any script.",
    sample: "There's no rush here. Read it once, then read it again — it gets better the second time.",
    gradient: "from-[#bae6fd] via-[#38bdf8] to-[#075985]",
    initials: "RI",
    flag: "🇺🇸",
  },
  {
    id: "TX3LPaxmHKxFdv7VOQHJ",
    name: "Liam",
    gender: "Male",
    language: "English",
    accent: "American",
    category: "Narration",
    age: "Young adult",
    description: "Young and warm with a friendly smile in the voice. Perfect for tutorials.",
    sample: "Alright, let's build something. By the end of this, you'll have a voice of your own.",
    gradient: "from-[#fed7aa] via-[#fb923c] to-[#7c2d12]",
    initials: "LI",
    flag: "🇺🇸",
  },
  {
    id: "XB0fDUnXU5powFXDhCwa",
    name: "Charlotte",
    gender: "Female",
    language: "English",
    accent: "Swedish",
    category: "Conversational",
    age: "Young adult",
    description: "Smooth and magnetic with a subtle Nordic accent. Made for premium brands.",
    sample: "Some things are better felt than explained. Let me show you what I mean.",
    gradient: "from-[#e9d5ff] via-[#a855f7] to-[#4c1d95]",
    initials: "CL",
    flag: "🇸🇪",
  },
  {
    id: "Xb7hH8MSUJpSbSDYk0k2",
    name: "Alice",
    gender: "Female",
    language: "English",
    accent: "British",
    category: "Narration",
    age: "Young adult",
    description: "Clear, confident and crisp. A brilliant fit for corporate and educational work.",
    sample: "Good communication is not about being heard. It is about being understood.",
    gradient: "from-[#fecdd3] via-[#fb7185] to-[#881337]",
    initials: "AL",
    flag: "🇬🇧",
  },
  {
    id: "XrExE9yKIg1WjnnlVkGX",
    name: "Matilda",
    gender: "Female",
    language: "English",
    accent: "American",
    category: "Narration",
    age: "Middle aged",
    description: "Warm and friendly with a knowing tone. Like a favourite teacher.",
    sample: "You already know the answer. You just needed someone to say it out loud with you.",
    gradient: "from-[#fef08a] via-[#eab308] to-[#713f12]",
    initials: "MA",
    flag: "🇺🇸",
  },
  {
    id: "bIHbv24MWmeRgasZH58o",
    name: "Will",
    gender: "Male",
    language: "English",
    accent: "American",
    category: "Conversational",
    age: "Young adult",
    description: "Friendly and easygoing. Sounds like a conversation, not a read.",
    sample: "So I tried it myself, and honestly? I didn't expect it to work this well.",
    gradient: "from-[#bbf7d0] via-[#4ade80] to-[#14532d]",
    initials: "WI",
    flag: "🇺🇸",
  },
  {
    id: "cgSgspJ2msm6clMCkdW9",
    name: "Jessica",
    gender: "Female",
    language: "English",
    accent: "American",
    category: "Conversational",
    age: "Young adult",
    description: "Playful and bright, with real personality. Ideal for social and gaming.",
    sample: "Okay okay okay — wait until you see what happens next. You are not ready.",
    gradient: "from-[#f5d0fe] via-[#e879f9] to-[#701a75]",
    initials: "JE",
    flag: "🇺🇸",
  },
  {
    id: "cjVigY5qzO86Huf0OWal",
    name: "Eric",
    gender: "Male",
    language: "English",
    accent: "American",
    category: "Narration",
    age: "Middle aged",
    description: "Trustworthy and steady. The voice of a good documentary or a solid brand.",
    sample: "Every great product starts with a simple question: what if this could be easier?",
    gradient: "from-[#cbd5e1] via-[#64748b] to-[#1e293b]",
    initials: "ER",
    flag: "🇺🇸",
  },
  {
    id: "iP95p4xoKVk53GoZ742B",
    name: "Chris",
    gender: "Male",
    language: "English",
    accent: "American",
    category: "Conversational",
    age: "Middle aged",
    description: "Casual and unpolished in the best way. Perfect for vlogs and tutorials.",
    sample: "I'm not going to lie, I messed this up the first three times. So let's skip to the good part.",
    gradient: "from-[#a5f3fc] via-[#22d3ee] to-[#164e63]",
    initials: "CR",
    flag: "🇺🇸",
  },
  {
    id: "nPczCjzI2devNBz1zQrb",
    name: "Brian",
    gender: "Male",
    language: "English",
    accent: "American",
    category: "Narration",
    age: "Middle aged",
    description: "Deep, cinematic and reassuring. Trailers, audiobooks, big ideas.",
    sample: "In a world of noise, the ones who are remembered are the ones who chose to speak.",
    gradient: "from-[#c7d2fe] via-[#6366f1] to-[#312e81]",
    initials: "BR",
    flag: "🇺🇸",
  },
  {
    id: "onwK4e9ZLuTAKqWW03F9",
    name: "Daniel",
    gender: "Male",
    language: "English",
    accent: "British",
    category: "Narration",
    age: "Middle aged",
    description: "Authoritative and polished. News, finance and high-end explainers.",
    sample: "The numbers tell one story. The people behind them tell another. Let's start with the people.",
    gradient: "from-[#ddd6fe] via-[#8b5cf6] to-[#2e1065]",
    initials: "DA",
    flag: "🇬🇧",
  },
  {
    id: "pFZP5JQG7iQjIQuC4Bku",
    name: "Lily",
    gender: "Female",
    language: "English",
    accent: "British",
    category: "Narration",
    age: "Young adult",
    description: "Velvety and warm with a gentle British lilt. Beautiful for fiction.",
    sample: "The letter arrived on a Tuesday, which is a strange day for a life to change.",
    gradient: "from-[#fbcfe8] via-[#ec4899] to-[#500724]",
    initials: "LY",
    flag: "🇬🇧",
  },
  {
    id: "ThT5KcBeYPX3keUQqHPh",
    name: "Dorothy",
    gender: "Female",
    language: "English",
    accent: "British",
    category: "Narration",
    age: "Middle aged",
    description: "Pleasant and precise. A classic British storyteller with a modern finish.",
    sample: "There is a particular kind of quiet that only exists just before something wonderful happens.",
    gradient: "from-[#fde2e4] via-[#f4a3a3] to-[#7f1d1d]",
    initials: "DO",
    flag: "🇬🇧",
  },
  {
    id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    gender: "Male",
    language: "English",
    accent: "American",
    category: "Narration",
    age: "Middle aged",
    description: "Deep and mature. The classic audiobook baritone, with modern clarity.",
    sample: "Chapter one. The house had been empty for thirty years, but the lights were on.",
    gradient: "from-[#d4d4d8] via-[#71717a] to-[#27272a]",
    initials: "AD",
    flag: "🇺🇸",
  },
  {
    id: "ErXwobaYiN019PkySvjV",
    name: "Antoni",
    gender: "Male",
    language: "English",
    accent: "American",
    category: "Narration",
    age: "Young adult",
    description: "Well-rounded and even. A reliable all-purpose voice for almost any script.",
    sample: "A good voice does not distract from the message. It delivers it, cleanly and with care.",
    gradient: "from-[#fed7aa] via-[#f97316] to-[#431407]",
    initials: "AN",
    flag: "🇺🇸",
  },
  {
    id: "TxGEqnHWrfWFTfGW9XjX",
    name: "Josh",
    gender: "Male",
    language: "English",
    accent: "American",
    category: "Conversational",
    age: "Young adult",
    description: "Young and calm. Great for apps, onboarding and friendly guidance.",
    sample: "No stress — I'll walk you through it one step at a time. First, take a look at this.",
    gradient: "from-[#bfdbfe] via-[#60a5fa] to-[#1e40af]",
    initials: "JO",
    flag: "🇺🇸",
  },
  {
    id: "VR6AewLTigWG4xSOukaG",
    name: "Arnold",
    gender: "Male",
    language: "English",
    accent: "American",
    category: "Character",
    age: "Middle aged",
    description: "Crisp and characterful. A little theatrical, in the best possible way.",
    sample: "Well, well, well. Look who finally decided to show up. I was beginning to think you'd forgotten me.",
    gradient: "from-[#fca5a5] via-[#ef4444] to-[#7f1d1d]",
    initials: "AR",
    flag: "🇺🇸",
  },
  {
    id: "AZnzlk1XvdvUeBnXmlld",
    name: "Domi",
    gender: "Female",
    language: "English",
    accent: "American",
    category: "Character",
    age: "Young adult",
    description: "Confident and a little mischievous. Perfect for games and animated worlds.",
    sample: "You want the truth? Fine. But you're not going to like it, and you're definitely not going to forget it.",
    gradient: "from-[#f0abfc] via-[#d946ef] to-[#701a75]",
    initials: "DM",
    flag: "🇺🇸",
  },
  {
    id: "MF3mGyEYCl7XYWbV9V6O",
    name: "Elli",
    gender: "Female",
    language: "English",
    accent: "American",
    category: "Character",
    age: "Young adult",
    description: "Emotional and expressive. Made for characters who feel everything deeply.",
    sample: "I keep thinking about that summer. The way the light came through the trees, like it was trying to tell us something.",
    gradient: "from-[#fecaca] via-[#f87171] to-[#7f1d1d]",
    initials: "EL",
    flag: "🇺🇸",
  },
  {
    id: "LcfcDJNUP1GQjkzn1xUU",
    name: "Emily",
    gender: "Female",
    language: "English",
    accent: "American",
    category: "Narration",
    age: "Young adult",
    description: "Calm and soft-spoken. A gentle fit for wellness and meditation.",
    sample: "Let your shoulders drop. Let the noise fade. For the next few minutes, nothing is required of you.",
    gradient: "from-[#c4b5fd] via-[#8b5cf6] to-[#4c1d95]",
    initials: "EM",
    flag: "🇺🇸",
  },
  {
    id: "pqHfZKP75CvOlQylNhV4",
    name: "Bill",
    gender: "Male",
    language: "English",
    accent: "American",
    category: "Narration",
    age: "Senior",
    description: "Seasoned, trustworthy and unhurried. Classic documentary gravitas.",
    sample: "They said the road ended here. They were wrong. It just stopped pretending to be a road.",
    gradient: "from-[#fdba74] via-[#ea580c] to-[#431407]",
    initials: "BI",
    flag: "🇺🇸",
  },

  /* -------------------- English · new non-expiring defaults -------------------- */
  {
    id: "gOupLcAkjEnguROwi4oS",
    name: "Darian",
    gender: "Male",
    language: "English",
    accent: "American",
    category: "Narration",
    age: "Middle aged",
    description: "A warm, grounded storyteller. One of ElevenLabs' new default voices.",
    sample: "Every town has a story it tells itself. This one is different, and it starts at the edge of the map.",
    gradient: "from-[#fcd34d] via-[#d97706] to-[#451a03]",
    initials: "DR",
    flag: "🇺🇸",
  },
  {
    id: "OZ0L6eISlOejga3XjDFt",
    name: "Talia",
    gender: "Female",
    language: "English",
    accent: "American",
    category: "Narration",
    age: "Young adult",
    description: "A warm, soft guide. Gentle direction without ever sounding scripted.",
    sample: "Close your eyes for a moment. Notice the air. Now let's begin, slowly.",
    gradient: "from-[#fbcfe8] via-[#f472b6] to-[#831843]",
    initials: "TA",
    flag: "🇺🇸",
  },
  {
    id: "WQP7cQUF5aAS6Axh5yaa",
    name: "Elara",
    gender: "Female",
    language: "English",
    accent: "American",
    category: "Narration",
    age: "Middle aged",
    description: "Crisp and professional. A polished narrator for brands and explainers.",
    sample: "Good design is invisible. You notice it only when it is missing — or when it sings.",
    gradient: "from-[#a5f3fc] via-[#06b6d4] to-[#164e63]",
    initials: "EL",
    flag: "🇺🇸",
  },
  {
    id: "jSuBIjxMKhqIfb0wCK1F",
    name: "Baxter",
    gender: "Male",
    language: "English",
    accent: "Australian",
    category: "Conversational",
    age: "Middle aged",
    description: "Dry, calm and unmistakably Australian. Perfectly deadpan.",
    sample: "Yeah, look, it's not a disaster. It's just a disaster with better lighting. Let's fix it.",
    gradient: "from-[#bef264] via-[#65a30d] to-[#1a2e05]",
    initials: "BX",
    flag: "🇦🇺",
  },
  {
    id: "6WwXjDDEMyNmFG95zycZ",
    name: "Eldrin",
    gender: "Male",
    language: "English",
    accent: "British",
    category: "Narration",
    age: "Middle aged",
    description: "A crisp British baritone. Cinematic, composed and quietly commanding.",
    sample: "The city was built on promises. Some were kept. Most were buried under the pavement.",
    gradient: "from-[#d6d3d1] via-[#78716c] to-[#1c1917]",
    initials: "ED",
    flag: "🇬🇧",
  },
  {
    id: "g7LVvkPWALzPxOQbF6OE",
    name: "Jade",
    gender: "Female",
    language: "English",
    accent: "American",
    category: "Conversational",
    age: "Young adult",
    description: "Upbeat and natural. Sounds like the friend who always has a good recommendation.",
    sample: "I found this last week and I have not stopped thinking about it. Okay, listen.",
    gradient: "from-[#f5d0fe] via-[#a855f7] to-[#4c1d95]",
    initials: "JD",
    flag: "🇺🇸",
  },
  {
    id: "FrS6cKLB1wg4WYgPa9GW",
    name: "Wyatt",
    gender: "Male",
    language: "English",
    accent: "American",
    category: "Narration",
    age: "Senior",
    description: "A seasoned mentor. Weathered, patient and full of hard-won perspective.",
    sample: "I've made every mistake there is. That's why I can tell you, with confidence, which ones matter.",
    gradient: "from-[#d4d4d8] via-[#52525b] to-[#18181b]",
    initials: "WY",
    flag: "🇺🇸",
  },
  {
    id: "22N9cF8z0o7y23njdyaY",
    name: "Florence",
    gender: "Female",
    language: "English",
    accent: "British",
    category: "Narration",
    age: "Middle aged",
    description: "Atmospheric, literary storytelling with a soft British finish.",
    sample: "There are houses that remember. This one remembered everything, and it was ready to tell.",
    gradient: "from-[#c4b5fd] via-[#7c3aed] to-[#2e1065]",
    initials: "FL",
    flag: "🇬🇧",
  },

  /* ------------------------------ Russian ------------------------------ */
  {
    id: "3EuKHIEZbSzrHGNmdYsx",
    name: "Nikolay",
    gender: "Male",
    language: "Russian",
    accent: "Russian",
    category: "Narration",
    age: "Middle aged",
    description: "A polished Russian narrator for YouTube and social. Clear, confident and Eleven v3 ready.",
    sample:
      "Добро пожаловать. Сегодня мы поговорим о том, как обычные идеи превращаются в большие истории.",
    sampleTranslation: "Welcome. Today we'll talk about how ordinary ideas become big stories.",
    gradient: "from-[#7dd3fc] via-[#2563eb] to-[#1e1b4b]",
    initials: "НК",
    flag: "🇷🇺",
    featured: true,
  },
  {
    id: "kwajW3Xh5svCeKU5ky2S",
    name: "Dmitry",
    gender: "Male",
    language: "Russian",
    accent: "Russian",
    category: "Conversational",
    age: "Young adult",
    description: "Cheerful young voice with a natural Russian accent. Great for social clips and demos.",
    sample: "Привет! Это Дмитрий. Давай сделаем что-нибудь классное — прямо сейчас.",
    sampleTranslation: "Hi! This is Dmitry. Let's make something cool — right now.",
    gradient: "from-[#fdba74] via-[#ea580c] to-[#431407]",
    initials: "ДМ",
    flag: "🇷🇺",
  },
  {
    id: "XuEV9VY3VUASYgJVNBh0",
    name: "Sergey",
    gender: "Male",
    language: "Russian",
    accent: "Russian",
    category: "Narration",
    age: "Middle aged",
    description: "Rich, engaging and captivating. A reliable choice for documentaries and long reads.",
    sample: "Есть голоса, которые запоминаются с первой фразы. Этот — из таких.",
    sampleTranslation: "There are voices you remember from the very first sentence. This is one of them.",
    gradient: "from-[#fde68a] via-[#b45309] to-[#3b1d05]",
    initials: "СГ",
    flag: "🇷🇺",
  },
  {
    id: "lxY8Pn0yWs1Ve9rBceah",
    name: "Ivan",
    gender: "Male",
    language: "Russian",
    accent: "Russian",
    category: "Narration",
    age: "Middle aged",
    description: "Professional bilingual narrator (Russian and English). Soft, expressive and unhurried.",
    sample: "Каждое слово имеет вес. Особенно когда за ним стоит настоящая история.",
    sampleTranslation: "Every word carries weight. Especially when a real story stands behind it.",
    gradient: "from-[#cbd5e1] via-[#475569] to-[#0f172a]",
    initials: "ИВ",
    flag: "🇷🇺",
  },
  {
    id: "rUOpAdbAl56KxO00wR5D",
    name: "Igor",
    gender: "Male",
    language: "Russian",
    accent: "Russian · St Petersburg",
    category: "Narration",
    age: "Middle aged",
    description: "Calm, warm bedtime storyteller. Made for slow, atmospheric narration.",
    sample: "Тихий вечер опускается на город. За окном идёт снег, а в комнате горит тёплый свет.",
    sampleTranslation: "A quiet evening settles over the city. Snow falls outside; a warm light burns inside.",
    gradient: "from-[#a5b4fc] via-[#4f46e5] to-[#1e1b4b]",
    initials: "ИГ",
    flag: "🇷🇺",
  },
  {
    id: "sRk0zCqhS2Cmv0bzx5wA",
    name: "Felix",
    gender: "Male",
    language: "Russian",
    accent: "Russian",
    category: "Conversational",
    age: "Middle aged",
    description: "Calm, clear and friendly. A dependable voice for tutorials and support content.",
    sample: "Не спеши. Давай разберёмся шаг за шагом — всё получится.",
    sampleTranslation: "Don't rush. Let's work through it step by step — it will all work out.",
    gradient: "from-[#99f6e4] via-[#0d9488] to-[#042f2e]",
    initials: "ФЛ",
    flag: "🇷🇺",
  },
  {
    id: "7G0NvIkWRnU0Dqjgz13p",
    name: "Kate",
    gender: "Female",
    language: "Russian",
    accent: "Russian",
    category: "Narration",
    age: "Middle aged",
    description: "Calm, natural and versatile. A clean read for corporate and educational scripts.",
    sample: "Хорошая речь не отвлекает от смысла. Она помогает ему звучать.",
    sampleTranslation: "A good delivery doesn't distract from the meaning. It helps it ring out.",
    gradient: "from-[#fecdd3] via-[#e11d48] to-[#4c0519]",
    initials: "КТ",
    flag: "🇷🇺",
  },
  {
    id: "FZGeNF7bE3syeQOynDKC",
    name: "Victoria",
    gender: "Female",
    language: "Russian",
    accent: "Russian",
    category: "Narration",
    age: "Middle aged",
    description: "Warm, engaging and expressive, with a rich mid-range tone. Excellent for audiobooks.",
    sample: "Иногда достаточно одной фразы, чтобы всё изменилось. Начнём с этой.",
    sampleTranslation: "Sometimes one sentence is enough for everything to change. Let's begin with this one.",
    gradient: "from-[#fbcfe8] via-[#db2777] to-[#500724]",
    initials: "ВК",
    flag: "🇷🇺",
    featured: true,
  },
  {
    id: "gedzfqL7OGdPbwm0ynTP",
    name: "Nadia",
    gender: "Female",
    language: "Russian",
    accent: "Russian",
    category: "Conversational",
    age: "Young adult",
    description: "Energetic, clear and polished. Ideal for ads, reels and confident brand voices.",
    sample: "Готовы? Поехали! Это будет быстро, ярко и очень по-русски.",
    sampleTranslation: "Ready? Let's go! This will be fast, bright and very Russian.",
    gradient: "from-[#f0abfc] via-[#c026d3] to-[#4a044e]",
    initials: "НД",
    flag: "🇷🇺",
  },
  {
    id: "Jbte7ht1CqapnZvc4KpK",
    name: "Kari",
    gender: "Female",
    language: "Russian",
    accent: "Russian",
    category: "Conversational",
    age: "Young adult",
    description: "Friendly, warm and engaging — like a conversation with someone you already know.",
    sample: "Привет! Как дела? Устраивайся поудобнее, у нас сегодня много интересного.",
    sampleTranslation: "Hi! How are you? Get comfortable — we have a lot of interesting things today.",
    gradient: "from-[#fed7aa] via-[#f97316] to-[#7c2d12]",
    initials: "КР",
    flag: "🇷🇺",
  },
  {
    id: "tHvkdDYIKRZSsD8v6JWR",
    name: "Irina",
    gender: "Female",
    language: "Russian",
    accent: "Russian",
    category: "Narration",
    age: "Young adult",
    description: "Soft, warm and gentle. Beautiful for meditation, wellness and quiet storytelling.",
    sample: "Сделай вдох. Пусть день отпустит тебя. Сейчас есть только этот момент.",
    sampleTranslation: "Take a breath. Let the day release you. Right now, there is only this moment.",
    gradient: "from-[#ddd6fe] via-[#7c3aed] to-[#2e1065]",
    initials: "ИР",
    flag: "🇷🇺",
  },
  {
    id: "EDpEYNf6XIeKYRzYcx4I",
    name: "Maria",
    gender: "Female",
    language: "Russian",
    accent: "Russian · Moscow",
    category: "Narration",
    age: "Middle aged",
    description: "Soft, measured and friendly. A professional voice for long-form narration.",
    sample: "Меня зовут Мария. Я расскажу эту историю так, как её стоит рассказать.",
    sampleTranslation: "My name is Maria. I'll tell this story the way it deserves to be told.",
    gradient: "from-[#fecaca] via-[#dc2626] to-[#450a0a]",
    initials: "МР",
    flag: "🇷🇺",
  },
  {
    id: "AB9XsbSA4eLG12t2myjN",
    name: "Larisa",
    gender: "Female",
    language: "Russian",
    accent: "Russian",
    category: "Character",
    age: "Young adult",
    description: "Confident and clear with a theatrical edge. Made for characters and animation.",
    sample: "Ну что, дорогой мой, начнём? Только не говори, что я тебя не предупреждала.",
    sampleTranslation: "Well then, my dear, shall we begin? Don't say I didn't warn you.",
    gradient: "from-[#e9d5ff] via-[#9333ea] to-[#3b0764]",
    initials: "ЛР",
    flag: "🇷🇺",
  },
  {
    id: "uCHtuBDOZxwmpHsKz7ii",
    name: "Svetlana",
    gender: "Female",
    language: "Russian",
    accent: "Russian",
    category: "Character",
    age: "Young adult",
    description: "A soft Russian whisper — an ASMR-flavoured voice for intimate, late-night audio.",
    sample: "Тише. Слушай. Это история, которую рассказывают только шёпотом.",
    sampleTranslation: "Hush. Listen. This is a story that is only ever told in a whisper.",
    gradient: "from-[#bae6fd] via-[#0ea5e9] to-[#082f49]",
    initials: "СВ",
    flag: "🇷🇺",
  },
];

export const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export const getVoice = (id: string): Voice => VOICES.find((v) => v.id === id) ?? VOICES[0];

export const ENGLISH_VOICES = VOICES.filter((v) => v.language === "English");
export const RUSSIAN_VOICES = VOICES.filter((v) => v.language === "Russian");

export const SAMPLES: Record<SampleLanguage, string[]> = {
  English: [
    "Welcome to Voxel, a small studio for big ideas. Type anything you like, pick a voice, and hear it come alive in seconds — no API keys, no setup, no waiting.",
    "There's a particular kind of magic in hearing your own words spoken back to you. It makes them feel real. So go on — write something worth listening to.",
    "In the quiet hours before dawn, the city belongs to the people who make things. The bakers, the writers, the coders chasing one last idea. This is for them.",
    "Introducing the next generation of hands-free storytelling. Simply speak, and watch your ideas take shape — instantly, naturally, and in your own voice.",
    "Somewhere between the first draft and the final cut, a story finds its voice. That's the part we love most. Let's find yours.",
  ],
  Russian: [
    "Привет! Добро пожаловать в Voxel — небольшую студию для больших идей. Введите любой текст, выберите голос и услышьте, как слова оживают за несколько секунд.",
    "Русский язык — один из самых выразительных в мире. Попробуйте прочитать этот текст голосом Николая или Виктории, и вы услышите, как меняется настроение.",
    "Тихий вечер опускается на город. За окном идёт снег, а в комнате горит тёплый свет. Есть истории, которые лучше всего звучат шёпотом.",
    "Иногда достаточно одной фразы, чтобы всё изменилось. Начните с этой: сегодня хороший день, чтобы сделать что-то важное.",
  ],
};

export const SAMPLE_SCRIPTS = SAMPLES.English;

export const SAMPLE_UPLOAD_URL = "https://assets.puter.site/example.mp3";

/* ------------------------------------------------------------------ */
/* Voice Library sync (puter.ai.txt2speech.listVoices)                  */
/* ------------------------------------------------------------------ */

const LIBRARY_GRADIENTS = [
  "from-[#93c5fd] via-[#3b82f6] to-[#1e3a8a]",
  "from-[#f9a8d4] via-[#c084fc] to-[#6d28d9]",
  "from-[#fcd34d] via-[#d97706] to-[#451a03]",
  "from-[#a7f3d0] via-[#34d399] to-[#065f46]",
  "from-[#fecaca] via-[#dc2626] to-[#450a0a]",
  "from-[#bae6fd] via-[#38bdf8] to-[#075985]",
  "from-[#e9d5ff] via-[#a855f7] to-[#4c1d95]",
  "from-[#d4d4d8] via-[#52525b] to-[#18181b]",
  "from-[#fed7aa] via-[#f97316] to-[#7c2d12]",
  "from-[#bef264] via-[#65a30d] to-[#1a2e05]",
  "from-[#c7d2fe] via-[#6366f1] to-[#312e81]",
  "from-[#99f6e4] via-[#0d9488] to-[#042f2e]",
];

const FLAGS: Array<[RegExp, string]> = [
  [/^ru|russ/i, "🇷🇺"],
  [/^uk|ukrain/i, "🇺🇦"],
  [/^pl|polish/i, "🇵🇱"],
  [/^en-gb|british/i, "🇬🇧"],
  [/^en-au|austral/i, "🇦🇺"],
  [/^en|english/i, "🇺🇸"],
  [/^es|spanish/i, "🇪🇸"],
  [/^fr|french/i, "🇫🇷"],
  [/^de|german/i, "🇩🇪"],
  [/^it|italian/i, "🇮🇹"],
  [/^pt|portug/i, "🇵🇹"],
  [/^tr|turk/i, "🇹🇷"],
  [/^ar|arab/i, "🇸🇦"],
  [/^hi|hindi/i, "🇮🇳"],
  [/^ja|japan/i, "🇯🇵"],
  [/^ko|korean/i, "🇰🇷"],
  [/^zh|chinese|mandarin/i, "🇨🇳"],
  [/^nl|dutch/i, "🇳🇱"],
  [/^sv|swedish/i, "🇸🇪"],
  [/^da|danish/i, "🇩🇰"],
  [/^no|norweg/i, "🇳🇴"],
  [/^fi|finnish/i, "🇫🇮"],
  [/^cs|czech/i, "🇨🇿"],
  [/^ro|romanian/i, "🇷🇴"],
  [/^hu|hungar/i, "🇭🇺"],
  [/^el|greek/i, "🇬🇷"],
  [/^he|hebrew/i, "🇮🇱"],
  [/^id|indones/i, "🇮🇩"],
  [/^vi|vietnam/i, "🇻🇳"],
  [/^th|thai/i, "🇹🇭"],
  [/^fil|tagalog/i, "🇵🇭"],
];

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function flagFor(...values: Array<string | undefined>): string {
  const haystack = values.filter(Boolean).join(" ").toLowerCase();
  return FLAGS.find(([pattern]) => pattern.test(haystack))?.[1] ?? "🌐";
}

function initialsFor(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N} ]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "AI";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function categoryFor(raw: string): VoiceCategory {
  const value = raw.toLowerCase();
  if (/convers|social|advert|promo/.test(value)) return "Conversational";
  if (/character|animation|gaming|game|villain/.test(value)) return "Character";
  return "Narration";
}

function ageFor(raw: string): string {
  const value = raw.toLowerCase();
  if (/young/.test(value)) return "Young adult";
  if (/old|senior|elder/.test(value)) return "Senior";
  if (/middle|adult/.test(value)) return "Middle aged";
  return "Voice library";
}

export function mapLibraryVoices(records: PuterVoiceRecord[]): Voice[] {
  const seen = new Set<string>();
  const mapped: Voice[] = [];

  for (const record of records) {
    if (!record) continue;
    const id = String(record.id ?? "").trim();
    if (!id || seen.has(id)) continue;
    const rawName = String(record.name ?? id).trim();
    const labels = record.labels ?? {};
    const languageObject = typeof record.language === "object" && record.language ? record.language : null;
    const languageText =
      typeof record.language === "string" ? record.language : (languageObject?.name ?? "");
    const languageCode = [
      languageObject?.code ?? "",
      labels.language ?? "",
      labels.accent ?? "",
      languageText,
    ]
      .filter(Boolean)
      .join(" ");

    const isRussian = /^ru\b|russ/i.test(languageCode);
    const isEnglish = /^en\b|english/i.test(languageCode) || !languageText;
    const language: VoiceLanguage = isRussian ? "Russian" : isEnglish ? "English" : "Other";
    const genderRaw = String(record.gender ?? labels.gender ?? "").toLowerCase();
    const gender: VoiceGender = /^m/.test(genderRaw) ? "Male" : /^f/.test(genderRaw) ? "Female" : "Neutral";
    const categoryRaw = `${record.category ?? ""} ${labels.use_case ?? ""} ${labels.useCase ?? ""}`;
    const ageRaw = labels.age ?? "";
    const description =
      record.description?.trim() ||
      labels.description?.trim() ||
      `${rawName} is an ElevenLabs Voice Library voice available through your Puter account.`;
    const dictation = language === "Russian" ? SAMPLES.Russian[2] : SAMPLES.English[0];

    mapped.push({
      id,
      name: rawName,
      gender,
      language,
      languageLabel: language === "Other" ? languageText || "Other languages" : undefined,
      accent: labels.accent ?? (languageText ? languageText.replace(/\s*\(.*\)/, "") : "Voice library"),
      category: categoryFor(categoryRaw),
      age: ageFor(ageRaw),
      description,
      sample: dictation,
      gradient: LIBRARY_GRADIENTS[hashString(id) % LIBRARY_GRADIENTS.length],
      initials: initialsFor(rawName),
      flag: flagFor(languageText, labels.accent, labels.language, languageObject?.code),
      isLibrary: true,
    });
    seen.add(id);
  }

  return mapped;
}

export function mergeLibraryVoices(curated: Voice[], library: Voice[]): Voice[] {
  const seen = new Set(curated.map((voice) => voice.id));
  return [...curated, ...library.filter((voice) => !seen.has(voice.id))];
}
