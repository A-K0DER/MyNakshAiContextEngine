import { NextFunction, Request, Response } from "express";
import { logEvent } from "../logger";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "Malformed JSON body." });
    return;
  }

  logEvent("unhandled_error", { error: err instanceof Error ? err.stack ?? err.message : String(err) });
  res.status(500).json({ error: "Internal server error." });
}
