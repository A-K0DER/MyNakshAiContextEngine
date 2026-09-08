import { NextFunction, Request, Response } from "express";
import { ErrorResponseBody } from "../models";
import { logEvent } from "../logger";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof SyntaxError && "body" in err) {
    const errorBody: ErrorResponseBody = { error: "Malformed JSON body." };
    res.status(400).json(errorBody);
    return;
  }

  logEvent("unhandled_error", { error: err instanceof Error ? err.stack ?? err.message : String(err) });
  const errorBody: ErrorResponseBody = { error: "Internal server error." };
  res.status(500).json(errorBody);
}
