export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok:false, error:"method_not_allowed" });

    const data = req.body || {};
    if (!data.termsAccepted) return res.status(400).json({ ok:false, error:"terms_required" });
    if (!data.signature) return res.status(400).json({ ok:false, error:"signature_required" });

    // 1) Build email text
    const lines = [
      `New Job Application (Allston Car Wash)`,
      `Submitted: ${data.submittedAt}`,
      ``,
      `Name: ${data.name}`,
      `Email: ${data.email}`,
      `Phone: ${data.phone}`,
      `Position: ${data.position}`,
      ``,
      `Address: ${data.street}, ${data.city}, ${data.state} ${data.zip}`,
      `Eligible to work: ${data.eligible}`,
      `Start date: ${data.startDate}`,
      `Under 18 work permit: ${data.under18 || "N/A"}`,
      `Employment type: ${data.employmentType}`,
      `Hours/week: ${data.hoursPerWeek}`,
      `Overtime: ${data.overtime}`,
      `Days available: ${(data.daysAvailable||[]).join(", ")}`,
      ``,
      `Driving stick shift: ${data.stick || "N/A"}`,
      `Driver's license: ${data.license || "N/A"}`,
      ``,
      `Employment history:`,
      `Company: ${data.company || ""}`,
      `Job title: ${data.jobTitle || ""}`,
      `Company phone: ${data.companyPhone || ""}`,
      `Contact for reference: ${data.contactRef || ""}`,
      ``,
      `Notes: ${data.notes || ""}`,
    ];
    const emailText = lines.join("\n");

    // 2) Send Email (RESEND example)
    // Create account on Resend and get RESEND_API_KEY
    const toEmails = (process.env.TO_EMAILS || "").split(",").map(s=>s.trim()).filter(Boolean);
    if (!toEmails.length) throw new Error("missing_TO_EMAILS");

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL, // e.g. "ACW Forms <forms@yourdomain.com>"
        to: toEmails,
        subject: `New Job Application: ${data.name} (${data.position})`,
        text: emailText
        // If you want signature image as attachment later, we can add it.
      })
    });

    if (!resendResp.ok) {
      const t = await resendResp.text();
      throw new Error("email_failed: " + t);
    }

    // 3) Send SMS to two phones (TWILIO example)
    // Put phones in env as TO_PHONES="+1xxx,+1yyy"
    const toPhones = (process.env.TO_PHONES || "").split(",").map(s=>s.trim()).filter(Boolean);

    if (toPhones.length) {
      const smsBody = `New ACW Job App: ${data.name} • ${data.position} • ${data.phone}`;

      for (const to of toPhones) {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
        const form = new URLSearchParams();
        form.append("To", to);
        form.append("From", process.env.TWILIO_FROM_NUMBER);
        form.append("Body", smsBody);

        const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
        const twilioResp = await fetch(twilioUrl, {
          method: "POST",
          headers: { "Authorization": `Basic ${auth}`, "Content-Type":"application/x-www-form-urlencoded" },
          body: form.toString()
        });

        if (!twilioResp.ok) {
          const t = await twilioResp.text();
          throw new Error("sms_failed: " + t);
        }
      }
    }

    return res.status(200).json({ ok:true });
  } catch (e) {
    return res.status(500).json({ ok:false, error: String(e.message || e) });
  }
}
