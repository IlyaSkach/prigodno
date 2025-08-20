const { readData } = require("./_storage");

exports.handler = async () => {
  try {
    const data = await readData();
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (e) {
    console.error("codes.read.error", e);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "failed_to_read",
        details: String(e && e.message ? e.message : e),
      }),
    };
  }
};
