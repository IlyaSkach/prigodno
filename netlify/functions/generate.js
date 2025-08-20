const { readData, writeData } = require("./_storage");
// nanoid — ESM‑only. Загружаем динамически внутри CJS функции
let __nano = null;
async function getNano() {
  if (!__nano) {
    const { customAlphabet } = await import("nanoid");
    __nano = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 10);
  }
  return __nano;
}

async function readCodes() {
  return readData();
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders() };
  }

  try {
    const { count = 1, prefix = "", tag = "" } = JSON.parse(event.body || "{}");
    const safeCount = Math.max(1, Math.min(500, Number(count) || 1));
    const prefixTrim = (prefix || "").trim().toUpperCase();
    const tagTrim = (tag || "").trim();

    const data = await readCodes();
    const existing = new Set(data.codes.map((c) => c.code));

    const newCodes = [];
    while (newCodes.length < safeCount) {
      const nano = await getNano();
      let code = nano();
      if (prefixTrim) code = `${prefixTrim}-${code}`;
      if (!existing.has(code)) {
        existing.add(code);
        newCodes.push({ code, tag: tagTrim, used: false });
      }
    }

    const next = { codes: [...newCodes, ...data.codes] };
    await writeData(next);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ added: newCodes.length }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({
        error: "failed_to_generate",
        details: String(e && e.message ? e.message : e),
      }),
    };
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
