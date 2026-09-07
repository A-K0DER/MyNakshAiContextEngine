import { HoroscopeProfile } from "../types";
import { buildMockHoroscope } from "./mockData";
import { simulateLatency, maybeFail } from "./simulate";

export async function getHoroscope(userId: string): Promise<HoroscopeProfile> {
  await simulateLatency();
  maybeFail("horoscopeService");
  return buildMockHoroscope(userId);
}
