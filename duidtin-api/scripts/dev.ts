import app from "../src/app.js";

const port = Number(process.env.PORT ?? 4000);

app.listen(port, () => {
  console.log(`[duidtin-api] jalan di http://localhost:${port}`);
});
