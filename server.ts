import "dotenv/config";
import { createApp } from "./src/app";

const port = Number(process.env.PORT ?? 3000);
const app = createApp();

app.listen(port, () => {
  console.log(`MyNaksh Personalization Engine listening on port ${port}`);
});
