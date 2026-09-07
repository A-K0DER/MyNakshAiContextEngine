import { KundliProfile } from "../types";
import { buildMockKundli } from "./mockData";
import { simulateLatency, maybeFail } from "./simulate";

export async function getKundli(userId: string): Promise<KundliProfile> {
  await simulateLatency();
  maybeFail("kundliService");
  return buildMockKundli(userId);
}
