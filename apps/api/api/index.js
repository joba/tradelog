// api/index.js
// Vercel serverless entry point.
// This file exports the Express app as a default handler — Vercel calls it
// like a function instead of keeping a persistent server process running.

import app from "../src/app.js";

export default app;
