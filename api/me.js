import crypto from "crypto";

function b64url(buf){
  return Buffer.from(buf).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
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
function parseCookies(req){
  const h = req.headers.cookie || "";
  const out = {};
  h.split(";").forEach(p=>{
    const i = p.indexOf("=");
    if (i>0) out[p.slice(0,i).trim()] = decodeURIComponent(p.slice(i+1).trim());
  });
  return out;
}

export default async function handler(req, res){
  try{
    const AUTH_SECRET = process.env.AUTH_SECRET || "";
    if (!AUTH_SECRET) return res.status(500).json({ ok:false, error:"missing_AUTH_SECRET" });

    const cookies = parseCookies(req);
    const token = cookies.acw_admin;
    const payload = verify(token, AUTH_SECRET);
    if (!payload) return res.status(401).json({ ok:false });

    return res.status(200).json({ ok:true, user: payload.user || "admin" });
  }catch(e){
    return res.status(500).json({ ok:false, error:String(e.message || e) });
  }
}
