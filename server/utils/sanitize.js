// NoSQL injection se bachav: body se "$" wale aur "." wale keys hata deta hai
const clean = (o, depth = 0) => {
  if (!o || typeof o !== 'object' || depth > 6) return;
  for (const k of Object.keys(o)) {
    if (k.startsWith('$') || k.includes('.')) delete o[k];
    else clean(o[k], depth + 1);
  }
};

export const sanitizeBody = (req, res, next) => {
  clean(req.body);
  next();
};