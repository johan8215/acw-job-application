export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "method_not_allowed" });
    }

    const data = req.body || {};

    // Required
    if (!data.termsAccepted) return res.status(400).json({ ok:false, error:"terms_required" });
    if (!data.signature)     return res.status(400).json({ ok:false, error:"signature_required" });

    const key = process.env.TEXTMEBOT_KEY;
    const phones = (process.env.TEXTMEBOT_PHONES || "")
      .split(",").map(s => s.trim()).filter(Boolean);

    if (!key) return res.status(500).json({ ok:false, error:"missing_TEXTMEBOT_KEY" });
    if (!phones.length) return res.status(500).json({ ok:false, error:"missing_TEXTMEBOT_PHONES" });

    const msg =
`🧾 New ACW Job Application
Name: ${data.name || ""}
Position: ${data.position || ""}
Phone: ${data.phone || ""}
Email: ${data.email || ""}
Start: ${data.startDate || ""}`;

    // IMPORTANT: use SAME base URL that worked in your Safari test
    for (const phone of phones) {
      const url =
        `https://api.textmebot.com/send.php` +
        `?recipient=${encodeURIComponent(phone)}` +
        `&apikey=${encodeURIComponent(key)}` +
        `&text=${encodeURIComponent(msg)}`;

      const r = await fetch(url);
      const t = await r.text();

      if (!r.ok) throw new Error(`textmebot_http_${r.status}: ${t}`);
      if (String(t).toLowerCase().includes("error")) throw new Error(`textmebot_error: ${t}`);
    }

    return res.status(200).json({ ok: true });

  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
