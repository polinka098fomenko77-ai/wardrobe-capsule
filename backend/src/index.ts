import "dotenv/config";
import { app } from "./app";
import { cleanupExpiredPhotos } from "./routes/photos";
import "./catalog/scheduler";

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`API: http://localhost:${port}`));

// Раз на годину прибираємо фото, у яких минув термін зберігання
const cleanup = () => cleanupExpiredPhotos().catch((e) => console.error("cleanup:", e));
cleanup();
setInterval(cleanup, 60 * 60 * 1000);
