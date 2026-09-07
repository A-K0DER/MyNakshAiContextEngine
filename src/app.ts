import express, { NextFunction, Request, Response } from "express";
import { personalizeRouter } from "./routes/personalize";
import { debugPersonalizationRouter } from "./routes/debugPersonalization";

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use(personalizeRouter);
  app.use(debugPersonalizationRouter);

  // Malformed JSON bodies land here as a SyntaxError from express.json().
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && "body" in err) {
      res.status(400).json({ error: "Malformed JSON body." });
      return;
    }
    next(err);
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  });

  return app;
}
