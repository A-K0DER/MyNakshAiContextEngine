// Shared helpers to give mock upstream services a realistic latency/failure profile.

export function simulateLatency(minMs = 100, maxMs = 800): Promise<void> {
  const delay = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export function maybeFail(serviceName: string, failureRate = 0.1): void {
  if (Math.random() < failureRate) {
    throw new Error(`${serviceName} transient failure`);
  }
}
