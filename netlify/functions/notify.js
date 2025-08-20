exports.handler = async (event) => {
  try {
    const {
      qty = 1,
      address = "",
      phone = "",
      date = "",
      promo = "",
      comment = "",
    } = JSON.parse(event.body || "{}");
    const text = [
      "Новая заявка (Netlify)",
      `Кол-во проверок: ${qty}`,
      `Адрес: ${address || "—"}`,
      `Телефон: ${phone || "—"}`,
      `Дата: ${date || "—"}`,
      `Промокод: ${promo || "—"}`,
      comment ? `Комментарий: ${comment}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const token = process.env.TELEGRAM_BOT_TOKEN || process.env.TG_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TG_CHAT_ID;

    if (!token || !chatId) {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, mocked: true }),
      };
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const tgRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const tgJson = await tgRes.json().catch(() => ({}));
    if (!tgRes.ok || tgJson.ok === false) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "tg_failed", details: tgJson || {} }),
      };
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "notify_failed",
        details: String(e && e.message ? e.message : e),
      }),
    };
  }
};
