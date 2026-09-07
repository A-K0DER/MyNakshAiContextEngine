import { UserProfile } from "../types";
import { buildMockUser } from "./mockData";
import { simulateLatency, maybeFail } from "./simulate";

export async function getUser(userId: string): Promise<UserProfile> {
  await simulateLatency();
  maybeFail("userService");
  return buildMockUser(userId);
}
