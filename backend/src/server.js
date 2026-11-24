import app from "./app.js";
import { validateSecurityEnv } from "./config/env.js";

validateSecurityEnv();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
