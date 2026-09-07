import {
  BirthDetails,
  DashaInfo,
  HouseInfo,
  KundliProfile,
  Language,
  PanchangInfo,
  Subscription,
  TonePreference,
  UserProfile,
} from "../types";

// Deterministic-ish pseudo-random generation seeded by userId so repeated
// calls for the same user return stable data (only latency/failure vary).

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length];
}

const NAMES = ["Aarav", "Diya", "Vihaan", "Ananya", "Kabir", "Ishita", "Rohan", "Meera"];
const LANGUAGES: readonly Language[] = ["English", "Hindi", "Hinglish"];
const SUBSCRIPTIONS: readonly Subscription[] = ["free", "premium", "pro"];
const TONES: readonly TonePreference[] = ["Formal", "Friendly", "Motivational", "Direct"];
const PLACES = ["Mumbai, India", "Delhi, India", "Bengaluru, India", "Jaipur, India", "Pune, India"];
const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];
const PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
const STRENGTHS: readonly HouseInfo["strength"][] = ["Strong", "Moderate", "Weak"];

export function buildMockUser(userId: string): UserProfile {
  const seed = hashString(userId);
  const birthDetails: BirthDetails = {
    date: `19${80 + (seed % 20)}-${String(1 + (seed % 12)).padStart(2, "0")}-${String(1 + (seed % 28)).padStart(2, "0")}`,
    time: `${String(seed % 24).padStart(2, "0")}:${String((seed * 7) % 60).padStart(2, "0")}`,
    place: pick(PLACES, seed),
  };
  return {
    id: userId,
    name: pick(NAMES, seed),
    language: pick(LANGUAGES, seed + 1),
    subscription: pick(SUBSCRIPTIONS, seed + 2),
    tonePreference: pick(TONES, seed + 3),
    birthDetails,
  };
}

export function buildMockKundli(userId: string): KundliProfile {
  const seed = hashString(userId + "kundli");
  const dasha: DashaInfo = {
    mahadasha: pick(PLANETS, seed),
    antardasha: pick(PLANETS, seed + 5),
  };
  const house = (offset: number): HouseInfo => ({
    lord: pick(PLANETS, seed + offset),
    strength: pick(STRENGTHS, seed + offset * 2),
  });
  return {
    userId,
    lagna: pick(SIGNS, seed),
    moonSign: pick(SIGNS, seed + 1),
    currentDasha: dasha,
    houses: {
      6: house(6),
      7: house(7),
      10: house(10),
    },
  };
}

const CAREER_TEXTS = [
  "Your career sector shows steady growth this period, with new opportunities likely to emerge through networking and visibility at work.",
  "Professional momentum is building; a change in role or responsibility is favored if approached with patience.",
  "This is a period of consolidation at work rather than dramatic change — focus on deepening expertise.",
];
const FINANCE_TEXTS = [
  "Financial inflows look stable, though this is not the ideal window for high-risk investments.",
  "A gradual improvement in cash flow is indicated; avoid impulsive large purchases for now.",
  "Saving discipline established now will pay off significantly in the next two quarters.",
];
const HEALTH_TEXTS = [
  "Energy levels are generally good, but attention to sleep and stress management is advised.",
  "Minor health fluctuations are possible; preventive care and routine checkups are recommended.",
  "Vitality is strong this period, a good window to start a new fitness routine.",
];
const RELATIONSHIP_TEXTS = [
  "Relationships benefit from open communication now; misunderstandings can be resolved with patience.",
  "A period of warmth and closeness is indicated in close relationships and partnerships.",
  "Existing bonds are being tested but are likely to emerge stronger with honest conversation.",
];

export function buildMockHoroscope(userId: string) {
  const seed = hashString(userId + "horoscope");
  return {
    userId,
    career: pick(CAREER_TEXTS, seed),
    finance: pick(FINANCE_TEXTS, seed + 1),
    health: pick(HEALTH_TEXTS, seed + 2),
    relationship: pick(RELATIONSHIP_TEXTS, seed + 3),
  };
}

const TITHIS = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami"];
const NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu"];
const YOGAS = ["Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda"];
const KARANAS = ["Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti"];

export function buildMockPanchang(date: string): PanchangInfo {
  const seed = hashString(date);
  return {
    date,
    tithi: pick(TITHIS, seed),
    nakshatra: pick(NAKSHATRAS, seed + 1),
    yoga: pick(YOGAS, seed + 2),
    karana: pick(KARANAS, seed + 3),
  };
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
