// Local dev server — not used by Vercel.
// Vercel imports src/app.js directly via api/index.js.
import app from "./app.js";

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Tradelog API running on port ${PORT}`);
});
