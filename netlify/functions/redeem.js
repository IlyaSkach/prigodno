const { readData, writeData } = require("./_storage");

async function readCodes() {
  return readData();
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders() };
  }

  try {
    const { code, usedBy = "" } = JSON.parse(event.body || "{}");
    const input = String(code || "")
      .trim()
      .toUpperCase();
    if (!input) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "empty_code" }),
      };
    }

    const data = await readCodes();
    const idx = data.codes.findIndex((c) => c.code.toUpperCase() === input);
    if (idx === -1) {
      return {
        statusCode: 404,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "not_found" }),
      };
    }
    if (data.codes[idx].used) {
      return {
        statusCode: 409,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "already_used" }),
      };
    }

    data.codes[idx].used = true;
    data.codes[idx].usedAt = new Date().toISOString();
    data.codes[idx].usedBy = usedBy || "anonymous";

    await writeData({ codes: data.codes });

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: true }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "failed_to_redeem" }),
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
