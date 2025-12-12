import crypto from "crypto";

function b64url(buf){
  return Buffer.from(buf).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
}
function sign(payload, secret){
  const body = b64url(JSON.stringify(payload));
  const sig  = b64url(crypto.createHmac("sha256", secret).update(body).digest());
  return `${body}.${sig}`;
}
function verify(token, secret){
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = b64url(crypto.createHmac("sha256", secret).update(body).digest());
  if (sig !== expected) return null;
  const payload = JSON.parse(Buffer.from(body.replace(/-/g,"+").replace(/_/g,"/"), "base64").toString("utf8"));
  if (payload.exp && Date.now() > payload.exp) return null;
  return payload;
}
function cookie(name, value, maxAgeSec){
  const parts = [
    `${name}=${value}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${maxAgeSec}`
  ];
  // Vercel production = https, cookie secure
  if (process.env.VERCEL_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export default async function handler(req, res){
  try{
    if (req.method !== "POST") return res.status(405).json({ ok:false, error:"method_not_allowed" });

    const { user, pass } = req.body || {};
    const ADMIN_USER = process.env.ADMIN_USER || "";
    const ADMIN_PASS = process.env.ADMIN_PASS || "";
    const AUTH_SECRET = process.env.AUTH_SECRET || "";

    if (!AUTH_SECRET) return res.status(500).json({ ok:false, error:"missing_AUTH_SECRET" });

    if (String(user||"") !== ADMIN_USER || String(pass||"") !== ADMIN_PASS){
      return res.status(401).json({ ok:false, error:"invalid_credentials" });
    }

    const payload = {
      user: ADMIN_USER,
      exp: Date.now() + 1000 * 60 * 60 * 12 // 12 horas
    };

    const token = sign(payload, AUTH_SECRET);
    res.setHeader("Set-Cookie", cookie("acw_admin", token, 60*60*12));
    return res.status(200).json({ ok:true });
  }catch(e){
    return res.status(500).json({ ok:false, error:String(e.message || e) });
  }
}
