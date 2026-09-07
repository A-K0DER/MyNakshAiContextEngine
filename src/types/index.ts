// ---------- Upstream service response shapes ----------

export type Language = "English" | "Hindi" | "Hinglish";
export type TonePreference = "Formal" | "Friendly" | "Motivational" | "Direct";
export type Subscription = "free" | "premium" | "pro";

export interface BirthDetails {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  place: string;
}

export interface UserProfile {
  id: string;
  name: string;
  language: Language;
  subscription: Subscription;
  tonePreference: TonePreference;
  birthDetails: BirthDetails;
}

export interface DashaInfo {
  mahadasha: string;
  antardasha: string;
}

export interface HouseInfo {
  lord: string;
  strength: "Strong" | "Moderate" | "Weak";
}

export interface KundliProfile {
  userId: string;
  lagna: string;
  moonSign: string;
  currentDasha: DashaInfo;
  houses: {
    6: HouseInfo;
    7: HouseInfo;
    10: HouseInfo;
  };
}

export interface HoroscopeProfile {
  userId: string;
  career: string;
  finance: string;
  health: string;
  relationship: string;
}

export interface PanchangInfo {
  date: string; // YYYY-MM-DD
  tithi: string;
  nakshatra: string;
  yoga: string;
  karana: string;
}

// ---------- Intent ----------

export type Intent = "career" | "relationship" | "health" | "finance" | "general";

// ---------- Fetch orchestrator ----------

export type ServiceName = "user" | "kundli" | "horoscope" | "panchang";

export interface ServiceResult<T> {
  status: "fulfilled" | "failed";
  data: T | null;
  error?: string;
  cacheHit: boolean;
  latencyMs: number;
  attempts: number;
}

export interface FetchedContext {
  user: ServiceResult<UserProfile>;
  kundli: ServiceResult<KundliProfile>;
  horoscope: ServiceResult<HoroscopeProfile>;
  panchang: ServiceResult<PanchangInfo>;
}

// ---------- Personalization engine ----------

export interface PersonalizationDecision {
  intent: Intent;
  selectedContext: Record<string, string>; // field name -> resolved value
  excludedContext: string[]; // field names excluded by rule or unresolved
  language: Language;
  tone: TonePreference;
  maxWords: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

// ---------- LLM provider ----------

export interface LLMResponse {
  answer: string;
}

export interface LLMProvider {
  generate(prompt: string): Promise<LLMResponse>;
}

// ---------- HTTP request/response bodies ----------

export interface PersonalizeRequestBody {
  userId: string;
  question: string;
}

export interface PersonalizeResponseBody {
  answer: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  sourcesUsed: string[];
}

export interface DebugPersonalizationResponseBody {
  intent: Intent;
  selectedContext: string[];
  excludedContext: string[];
  language: Language;
  tone: TonePreference;
}
