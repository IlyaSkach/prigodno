const { readData, writeData } = require("./_storage");
const { customAlphabet } = require("nanoid");

const nano = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 10);

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
