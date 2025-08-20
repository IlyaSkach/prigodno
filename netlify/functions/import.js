const { readData, writeData } = require("./_storage");

async function readCodes() {
  return readData();
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders() };
  }

  try {
    const { entries = [] } = JSON.parse(event.body || "{}");
    const clean = entries
      .map((e) => ({
        code: String(e.code || "")
          .trim()
          .toUpperCase(),
        tag: String(e.tag || "").trim(),
      }))
      .filter((e) => e.code);

    const data = await readCodes();
    const existing = new Set(data.codes.map((c) => c.code));
    const newOnes = [];
    for (const e of clean) {
      if (!existing.has(e.code)) {
        existing.add(e.code);
        newOnes.push({ code: e.code, tag: e.tag, used: false });
      }
    }

    if (newOnes.length) {
      await writeData({ codes: [...newOnes, ...data.codes] });
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ added: newOnes.length }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "failed_to_import" }),
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
