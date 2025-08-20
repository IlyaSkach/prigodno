const fs = require("fs");
const path = require("path");
// @netlify/blobs — ESM‑only. В среде функций (CJS) подключаем через динамический import
let _blobsMod = null;
async function getStoreAsync() {
  if (!_blobsMod) {
    _blobsMod = await import("@netlify/blobs");
  }
  return _blobsMod.getStore;
}

async function createStore(name) {
  const getStore = await getStoreAsync();
  const manualSiteID = process.env.BLOBS_SITE_ID;
  const manualToken = process.env.BLOBS_TOKEN;
  if (manualSiteID && manualToken) {
    return getStore({ name, siteID: manualSiteID, token: manualToken });
  }
  return getStore({ name });
}

const FILE_DIR = path.resolve(process.cwd(), ".data");
const FILE_PATH = path.join(FILE_DIR, "codes.json");

async function readFromFs() {
  try {
    if (!fs.existsSync(FILE_DIR)) fs.mkdirSync(FILE_DIR, { recursive: true });
    if (!fs.existsSync(FILE_PATH)) return { codes: [] };
    const raw = fs.readFileSync(FILE_PATH, "utf8");
    const json = JSON.parse(raw || "{}");
    return Array.isArray(json?.codes) ? json : { codes: [] };
  } catch {
    return { codes: [] };
  }
}

async function writeToFs(data) {
  if (!fs.existsSync(FILE_DIR)) fs.mkdirSync(FILE_DIR, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), "utf8");
}

function isNetlify() {
  return Boolean(
    process.env.NETLIFY ||
      process.env.DEPLOY_ID ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT ||
      process.env.AWS_REGION
  );
}

async function readData() {
  // On Netlify: use Blobs only (filesystem is read-only)
  if (isNetlify()) {
    const store = await createStore("prigodno-codes");
    const json = await store
      .get("codes.json", { type: "json" })
      .catch(() => null);
    return json && Array.isArray(json.codes) ? json : { codes: [] };
  }
  // Local dev: try blobs first, then fallback to filesystem
  try {
    const store = await createStore("prigodno-codes");
    const json = await store.get("codes.json", { type: "json" });
    if (json && typeof json === "object" && Array.isArray(json.codes))
      return json;
  } catch {}
  return readFromFs();
}

async function writeData(next) {
  if (isNetlify()) {
    const store = await createStore("prigodno-codes");
    await store.setJSON("codes.json", next); // throw if fails to surface error in logs
    return;
  }
  try {
    const store = await createStore("prigodno-codes");
    await store.setJSON("codes.json", next);
  } catch {
    await writeToFs(next);
  }
}

module.exports = { readData, writeData };
