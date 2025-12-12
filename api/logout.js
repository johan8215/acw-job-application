export default async function handler(req, res){
  if (req.method !== "POST") return res.status(405).json({ ok:false, error:"method_not_allowed" });

  const parts = [
    "acw_admin=",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0"
  ];
  if (process.env.VERCEL_ENV === "production") parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
  return res.status(200).json({ ok:true });
}
