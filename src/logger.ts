export function logEvent(event: string, fields: Record<string, unknown>): void {
  const entry = {
    ts: new Date().toISOString(),
    event,
    ...fields,
  };
  console.log(JSON.stringify(entry));
}
