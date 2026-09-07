import { PanchangInfo } from "../types";
import { buildMockPanchang, todayDateString } from "./mockData";
import { simulateLatency, maybeFail } from "./simulate";

// Panchang is date-scoped, not user-scoped — it takes no userId.
export async function getPanchang(): Promise<PanchangInfo> {
  await simulateLatency();
  maybeFail("panchangService");
  return buildMockPanchang(todayDateString());
}
