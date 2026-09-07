import { Intent, Language, TonePreference } from "../types";

export interface IntentRule {
  primaryContext: string[];
  secondaryContext: string[];
  excludedContext: string[];
  defaultTone: TonePreference;
  defaultLanguage: Language;
  defaultMaxWords: number;
}

// Single source of truth for how each intent is personalized. Adding a new
// intent or changing a rule means editing this object — the engine's control
// flow never branches on intent.
export const PERSONALIZATION_RULES: Record<Intent, IntentRule> = {
  career: {
    primaryContext: ["Career Horoscope", "10th House", "Current Dasha"],
    secondaryContext: ["Today's Panchang"],
    excludedContext: ["Relationship Horoscope", "Health Horoscope", "Finance Horoscope", "6th House", "7th House"],
    defaultTone: "Motivational",
    defaultLanguage: "English",
    defaultMaxWords: 180,
  },
  relationship: {
    primaryContext: ["Relationship Horoscope", "7th House", "Current Dasha"],
    secondaryContext: ["Today's Panchang"],
    excludedContext: ["Career Horoscope", "Health Horoscope", "Finance Horoscope", "10th House", "6th House"],
    defaultTone: "Friendly",
    defaultLanguage: "English",
    defaultMaxWords: 180,
  },
  health: {
    primaryContext: ["Health Horoscope", "6th House", "Current Dasha"],
    secondaryContext: ["Today's Panchang"],
    excludedContext: ["Career Horoscope", "Relationship Horoscope", "Finance Horoscope", "10th House", "7th House"],
    defaultTone: "Direct",
    defaultLanguage: "English",
    defaultMaxWords: 150,
  },
  finance: {
    primaryContext: ["Finance Horoscope", "Current Dasha"],
    secondaryContext: ["Today's Panchang", "10th House"],
    excludedContext: ["Career Horoscope", "Relationship Horoscope", "Health Horoscope", "6th House", "7th House"],
    defaultTone: "Formal",
    defaultLanguage: "English",
    defaultMaxWords: 180,
  },
  general: {
    primaryContext: ["Lagna", "Moon Sign", "Current Dasha"],
    secondaryContext: ["Today's Panchang"],
    excludedContext: ["Career Horoscope", "Relationship Horoscope", "Health Horoscope", "Finance Horoscope"],
    defaultTone: "Friendly",
    defaultLanguage: "English",
    defaultMaxWords: 150,
  },
};
