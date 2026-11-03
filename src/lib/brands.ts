// What a subscription looks like on the spend page: a logo and a colour,
// picked from its name. "Netflix" gets the Netflix logo in Netflix red, "Rent"
// gets a house, and anything unknown gets its first letter in a steady colour.
//
// Logos come from Simple Icons (CC0) and live in /public/brands, so nothing is
// fetched from anyone else and the list of what you pay for stays with you.

export type Glyph =
  | "home" | "phone" | "wifi" | "gym" | "shield" | "zap" | "flame" | "drop" | "train" | "bus" | "car"
  | "school" | "bank" | "music" | "tv" | "cloud" | "game" | "news" | "sparkles" | "book";

export interface BrandLook {
  /** Accent colour, already light enough to read on the dark page. */
  color: string;
  /** File name in /public/brands, without ".svg". */
  icon?: string;
  /** A generic icon, for things with no logo of their own. */
  glyph?: Glyph;
  /** One or two characters, when there is neither. */
  letter?: string;
}

/** Stands in for brands whose own colour is black, which vanishes on this page. */
const LIGHT = "#E4E4E7";

// Most specific first: "Apple Music" has to win over "Apple".
const BRANDS: [RegExp, BrandLook][] = [
  [/apple\s*music/, { icon: "applemusic", color: "#FA243C" }],
  [/apple\s*tv/, { icon: "appletv", color: LIGHT }],
  [/icloud/, { icon: "icloud", color: "#3693F3" }],
  [/apple/, { icon: "apple", color: LIGHT }],
  [/youtube\s*music|yt\s*music/, { icon: "youtubemusic", color: "#FF0000" }],
  [/youtube|yt\s*premium/, { icon: "youtube", color: "#FF0000" }],
  [/netflix/, { icon: "netflix", color: "#E50914" }],
  [/spotify/, { icon: "spotify", color: "#1ED760" }],
  [/deezer/, { icon: "deezer", color: "#A238FF" }],
  [/tidal/, { icon: "tidal", color: LIGHT }],
  [/soundcloud/, { icon: "soundcloud", color: "#FF5500" }],
  [/audible/, { icon: "audible", color: "#F8991C" }],
  [/disney/, { letter: "D+", color: "#4C7DFF" }],
  [/prime|amazon/, { letter: "a", color: "#00A8E1" }],
  [/hbo/, { icon: "hbomax", color: LIGHT }],
  [/crunchyroll/, { icon: "crunchyroll", color: "#FF5E00" }],
  [/paramount/, { icon: "paramountplus", color: "#3D8BFF" }],
  [/dazn/, { icon: "dazn", color: "#F8F8F5" }],
  [/mubi/, { icon: "mubi", color: LIGHT }],
  [/chatgpt|openai/, { glyph: "sparkles", color: "#10A37F" }],
  [/claude|anthropic/, { icon: "claude", color: "#D97757" }],
  [/gemini/, { icon: "googlegemini", color: "#8E75B2" }],
  [/perplexity/, { icon: "perplexity", color: "#1FB8CD" }],
  [/copilot/, { icon: "githubcopilot", color: LIGHT }],
  [/github/, { icon: "github", color: LIGHT }],
  [/cursor/, { icon: "cursor", color: LIGHT }],
  [/jetbrains|intellij|pycharm|webstorm|clion/, { icon: "jetbrains", color: LIGHT }],
  [/vercel/, { icon: "vercel", color: LIGHT }],
  [/linear/, { icon: "linear", color: "#7C85E8" }],
  [/raycast/, { icon: "raycast", color: "#FF6363" }],
  [/setapp/, { icon: "setapp", color: "#E6C3A5" }],
  [/notion/, { icon: "notion", color: LIGHT }],
  [/figma/, { icon: "figma", color: "#F24E1E" }],
  [/canva/, { letter: "C", color: "#00C4CC" }],
  [/adobe|photoshop|lightroom|creative\s*cloud/, { letter: "A", color: "#FF3B30" }],
  [/microsoft|office|onedrive|outlook|\b365\b/, { letter: "M", color: "#00A4EF" }],
  [/google\s*(one|drive|storage)/, { icon: "googledrive", color: "#4285F4" }],
  [/google/, { icon: "google", color: "#4285F4" }],
  [/dropbox/, { icon: "dropbox", color: "#3D8BFF" }],
  [/proton\s*vpn/, { icon: "protonvpn", color: "#66DEB1" }],
  [/proton/, { icon: "proton", color: "#8B70FF" }],
  [/nord\s*vpn/, { icon: "nordvpn", color: "#4687FF" }],
  [/express\s*vpn/, { icon: "expressvpn", color: "#DA3940" }],
  [/1\s*password/, { icon: "1password", color: "#3B82F6" }],
  [/bitwarden/, { icon: "bitwarden", color: "#3B82F6" }],
  [/grammarly/, { icon: "grammarly", color: "#15C39A" }],
  [/duolingo/, { icon: "duolingo", color: "#58CC02" }],
  [/coursera/, { icon: "coursera", color: "#3D8BFF" }],
  [/udemy/, { icon: "udemy", color: "#A435F0" }],
  [/leetcode/, { icon: "leetcode", color: "#FFA116" }],
  [/chess/, { icon: "chessdotcom", color: "#81B64C" }],
  [/discord|nitro/, { icon: "discord", color: "#5865F2" }],
  [/twitch/, { icon: "twitch", color: "#9146FF" }],
  [/patreon/, { icon: "patreon", color: LIGHT }],
  [/medium/, { icon: "medium", color: LIGHT }],
  [/strava/, { icon: "strava", color: "#FC4C02" }],
  [/headspace/, { icon: "headspace", color: "#F47D31" }],
  [/tinder/, { icon: "tinder", color: "#FF6B6B" }],
  [/^x$|^x\s|twitter/, { icon: "x", color: LIGHT }],
  [/uber\s*eats/, { icon: "ubereats", color: "#06C167" }],
  [/uber/, { icon: "uber", color: LIGHT }],
  [/deliveroo/, { icon: "deliveroo", color: "#00CCBC" }],
  [/revolut/, { icon: "revolut", color: LIGHT }],
  [/n26/, { icon: "n26", color: "#48AC98" }],
  [/paypal/, { icon: "paypal", color: "#009CDE" }],
  [/klarna/, { icon: "klarna", color: "#FFB3C7" }],
  [/playstation|ps\s*plus|psn/, { icon: "playstation", color: "#3D8BFF" }],
  [/xbox|game\s*pass/, { glyph: "game", color: "#3CB043" }],
  [/nintendo/, { glyph: "game", color: "#E60012" }],
  [/steam/, { icon: "steam", color: LIGHT }],
  [/epic\s*games|fortnite/, { icon: "epicgames", color: LIGHT }],
  [/ubisoft/, { icon: "ubisoft", color: LIGHT }],
  [/orange/, { icon: "orange", color: "#FF7900" }],
  [/vodafone/, { icon: "vodafone", color: "#E60000" }],
  [/proximus/, { letter: "P", color: "#A06CD5" }],
  [/telenet/, { letter: "T", color: "#FFC421" }],
  [/tango/, { letter: "T", color: "#FF3B5C" }],
  [/\bpost\b/, { letter: "P", color: "#FFCC00" }],
  [/sncb|nmbs/, { glyph: "train", color: "#2E9BE6" }],
  [/basic[\s-]*fit/, { glyph: "gym", color: "#FE7000" }],
];

// Things with no logo, recognised by what they are.
const KINDS: [RegExp, BrandLook][] = [
  [/\b(rent|loyer|miete|huur|housing|logement|apartment|appartement|flat|studio|room|chambre|kot|dorm)\b/, { glyph: "home", color: "#F59E0B" }],
  [/\b(phone|mobile|gsm|forfait|sim|telecom)\b/, { glyph: "phone", color: "#22D3EE" }],
  [/\b(internet|wifi|wi-fi|fibre|fiber|broadband)\b/, { glyph: "wifi", color: "#38BDF8" }],
  [/\b(gym|fitness|sport|crossfit|yoga|climbing|swim\w*)\b/, { glyph: "gym", color: "#F97316" }],
  [/insurance|assurance|versicherung|verzekering|mutuelle|\bhealth\b/, { glyph: "shield", color: "#A3E635" }],
  [/electric|électricité|energy|énergie|\bpower\b|enovos|engie|luminus/, { glyph: "zap", color: "#FACC15" }],
  [/\b(gas|gaz)\b/, { glyph: "flame", color: "#FB923C" }],
  [/\b(water|eau)\b/, { glyph: "drop", color: "#60A5FA" }],
  [/train|rail|bahn|\bsbb\b|\bcfl\b|thalys|eurostar/, { glyph: "train", color: "#3B82F6" }],
  [/\b(bus|tram|metro|transport|stib|tec|navigo)\b|de\s*lijn/, { glyph: "bus", color: "#22C55E" }],
  [/\b(uni|tuition|school|minerval|course|student)\b|universit/, { glyph: "school", color: "#A78BFA" }],
  [/\b(car|parking|fuel|petrol|leasing)\b/, { glyph: "car", color: "#94A3B8" }],
  [/\b(bank|account)\b/, { glyph: "bank", color: "#94A3B8" }],
  [/\b(music|radio|podcasts?)\b/, { glyph: "music", color: "#F472B6" }],
  [/\b(tv|streaming|cinema|movies?|films?)\b/, { glyph: "tv", color: "#F87171" }],
  [/\b(cloud|storage|backup)\b/, { glyph: "cloud", color: "#38BDF8" }],
  [/\b(games?|gaming)\b/, { glyph: "game", color: "#A3E635" }],
  [/\b(news|newspaper|journal|magazine)\b/, { glyph: "news", color: LIGHT }],
  [/\b(ai|gpt)\b/, { glyph: "sparkles", color: "#10A37F" }],
  [/\b(books?|kindle|reading)\b/, { glyph: "book", color: "#FBBF24" }],
];

// For everything else: picked by the name, so the same name always gets the same colour.
const PALETTE = ["#22D3EE", "#34D399", "#A78BFA", "#FB923C", "#F472B6", "#FACC15", "#60A5FA", "#A3E635", "#FB7185", "#2DD4BF"];

const hash = (text: string): number => {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
};

/** The logo and colour for a subscription called `name`. The category helps when the name alone does not. */
export function brandLook(name: string, category?: string): BrandLook {
  const n = name.toLowerCase().trim();
  for (const [re, look] of BRANDS) if (re.test(n)) return look;
  const both = `${n} ${(category ?? "").toLowerCase()}`;
  for (const [re, look] of KINDS) if (re.test(both)) return look;
  const first = name.trim().match(/[\p{L}\p{N}]/u)?.[0] ?? "?";
  return { letter: first.toUpperCase(), color: PALETTE[hash(n) % PALETTE.length] };
}

/** `#RRGGBB` plus an alpha from 0 to 1, for tints. */
export const tint = (hex: string, alpha: number): string =>
  `${hex}${Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0")}`;
