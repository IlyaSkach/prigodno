require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { customAlphabet } = require("nanoid");
const { readData, writeData } = require("./netlify/functions/_storage");

const app = express();
const PORT = process.env.PORT || 8888;
const nano = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 10);

app.use(cors());
app.use(bodyParser.json());

// API
app.get("/api/codes", async (_req, res) => {
  try {
    const data = await readData();
    res.json(data);
  } catch (e) {
    res.status(500).json({
      error: "failed_to_read",
      details: String(e && e.message ? e.message : e),
    });
  }
});

app.post("/api/generate", async (req, res) => {
  try {
    const { count = 1, prefix = "", tag = "" } = req.body || {};
    const safeCount = Math.max(1, Math.min(500, Number(count) || 1));
    const prefixTrim = String(prefix || "")
      .trim()
      .toUpperCase();
    const tagTrim = String(tag || "").trim();

    const data = await readData();
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
    res.json({ added: newCodes.length });
  } catch (e) {
    res.status(500).json({
      error: "failed_to_generate",
      details: String(e && e.message ? e.message : e),
    });
  }
});

app.post("/api/import", async (req, res) => {
  try {
    const { entries = [] } = req.body || {};
    const clean = entries
      .map((e) => ({
        code: String(e.code || "")
          .trim()
          .toUpperCase(),
        tag: String(e.tag || "").trim(),
      }))
      .filter((e) => e.code);
    const data = await readData();
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
    res.json({ added: newOnes.length });
  } catch (e) {
    res.status(500).json({
      error: "failed_to_import",
      details: String(e && e.message ? e.message : e),
    });
  }
});

app.post("/api/redeem", async (req, res) => {
  try {
    const { code, usedBy = "" } = req.body || {};
    const input = String(code || "")
      .trim()
      .toUpperCase();
    if (!input) return res.status(400).json({ error: "empty_code" });
    const data = await readData();
    const idx = data.codes.findIndex(
      (c) => String(c.code || "").toUpperCase() === input
    );
    if (idx === -1) return res.status(404).json({ error: "not_found" });
    if (data.codes[idx].used)
      return res.status(409).json({ error: "already_used" });
    data.codes[idx].used = true;
    data.codes[idx].usedAt = new Date().toISOString();
    data.codes[idx].usedBy = usedBy || "anonymous";
    await writeData({ codes: data.codes });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({
      error: "failed_to_redeem",
      details: String(e && e.message ? e.message : e),
    });
  }
});

// Telegram notify (fallback: лог в консоль, если токены не заданы)
app.post("/api/notify", async (req, res) => {
  try {
    const {
      qty = 1,
      address = "",
      phone = "",
      date = "",
      promo = "",
      comment = "",
    } = req.body || {};
    const text = [
      "Новая заявка (локальный тест)",
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
      console.log("[notify] TG disabled. Message would be:\n" + text);
      return res.json({ ok: true, mocked: true });
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const tgRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const tgJson = await tgRes.json().catch(() => ({}));
    if (!tgRes.ok || tgJson.ok === false) {
      return res
        .status(502)
        .json({ error: "tg_failed", details: tgJson || {} });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({
      error: "notify_failed",
      details: String(e && e.message ? e.message : e),
    });
  }
});

// Static
app.use(express.static(path.join(__dirname, "public")));

// Serve маркетинговый сайт под /site для удобного локального теста
app.use("/site", express.static(path.resolve(__dirname, "../prigodno")));

app.listen(PORT, () => {
  console.log(`Local server listening on http://localhost:${PORT}`);
});
