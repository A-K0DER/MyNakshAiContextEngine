import { Intent, Language, TonePreference } from "../types";

export interface DebugPersonalizationResponseBody {
  intent: Intent;
  selectedContext: string[];
  excludedContext: string[];
  language: Language;
  tone: TonePreference;
}
