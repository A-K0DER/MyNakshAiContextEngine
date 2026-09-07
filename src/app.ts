import express from "express";
import { personalizeRouter } from "./routes/personalize";
import { debugPersonalizationRouter } from "./routes/debugPersonalization";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use(personalizeRouter);
  app.use(debugPersonalizationRouter);

  app.use(errorHandler);

  return app;
}
