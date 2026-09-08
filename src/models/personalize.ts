export interface PersonalizeRequestBody {
  userId: string;
  question: string;
}

export interface PersonalizeResponseBody {
  answer: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  sourcesUsed: string[];
}
