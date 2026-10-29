import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Product from '../models/Product.js';
import Appointment from '../models/Appointment.js';
import Order from '../models/Order.js';
import Refund from '../models/Refund.js';
import asyncHandler from '../utils/asyncHandler.js';
import escapeRegex from '../utils/escapeRegex.js';
import parseQuery from '../utils/parseQuery.js';
import { doctorIdsAvailable } from '../utils/availabilityFilter.js';
import { istToday } from '../utils/slots.js';

const TXT = {
  emergency: {
    en: 'This sounds urgent. Please call 112 or go to the nearest hospital right now. I cannot help with medical emergencies.',
    hi: 'यह गंभीर लग रहा है। कृपया तुरंत 112 पर कॉल करें या नज़दीकी अस्पताल जाएँ। मैं आपातकाल में मदद नहीं कर सकता।',
    pa: 'ਇਹ ਗੰਭੀਰ ਲੱਗਦਾ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਤੁਰੰਤ 112 ਤੇ ਕਾਲ ਕਰੋ ਜਾਂ ਨੇੜਲੇ ਹਸਪਤਾਲ ਜਾਓ। ਮੈਂ ਐਮਰਜੈਂਸੀ ਵਿੱਚ ਮਦਦ ਨਹੀਂ ਕਰ ਸਕਦਾ।',
  },
  advice: {
    en: 'I cannot diagnose conditions or suggest medicines or doses. A qualified doctor can help, and I can find one for you.',
    hi: 'मैं बीमारी की पहचान या दवा/खुराक नहीं बता सकता। योग्य डॉक्टर आपकी मदद कर सकते हैं; मैं आपके लिए डॉक्टर ढूँढ सकता हूँ।',
    pa: 'ਮੈਂ ਬਿਮਾਰੀ ਦੀ ਪਛਾਣ ਜਾਂ ਦਵਾਈ/ਖੁਰਾਕ ਨਹੀਂ ਦੱਸ ਸਕਦਾ। ਯੋਗ ਡਾਕਟਰ ਤੁਹਾਡੀ ਮਦਦ ਕਰ ਸਕਦੇ ਹਨ; ਮੈਂ ਤੁਹਾਡੇ ਲਈ ਡਾਕਟਰ ਲੱਭ ਸਕਦਾ ਹਾਂ।',
  },
  fallback: {
    en: 'I can help you find doctors, understand booking, cancellation and refunds, browse medicines, and check your appointment, order or refund status. Try: "skin specialist near Barnala".',
    hi: 'मैं डॉक्टर ढूँढने, बुकिंग/कैंसिलेशन/रिफंड समझाने, दवाइयाँ खोजने और आपकी अपॉइंटमेंट, ऑर्डर या रिफंड की स्थिति बताने में मदद कर सकता हूँ।',
    pa: 'ਮੈਂ ਡਾਕਟਰ ਲੱਭਣ, ਬੁਕਿੰਗ/ਕੈਂਸਲੇਸ਼ਨ/ਰਿਫੰਡ ਸਮਝਾਉਣ, ਦਵਾਈਆਂ ਲੱਭਣ ਅਤੇ ਤੁਹਾਡੀ ਅਪਾਇੰਟਮੈਂਟ, ਆਰਡਰ ਜਾਂ ਰਿਫੰਡ ਦੀ ਸਥਿਤੀ ਦੱਸਣ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ।',
  },
  login: {
    en: 'Please log in as a patient to check this.',
    hi: 'यह देखने के लिए कृपया मरीज़ के रूप में लॉगिन करें।',
    pa: 'ਇਹ ਵੇਖਣ ਲਈ ਕਿਰਪਾ ਕਰਕੇ ਮਰੀਜ਼ ਵਜੋਂ ਲੌਗਇਨ ਕਰੋ।',
  },
};

const FAQ = [
  {
    keys: ['how to book', 'how do i book', 'how can i book', 'booking process', 'बुक कैसे', 'ਬੁੱਕ ਕਿਵੇਂ'],
    en: 'To book: open Find a Doctor, pick a doctor, choose a date and a free slot, then confirm. You can pay online or, if the doctor allows it, at the clinic.',
    hi: 'बुक करने के लिए "डॉक्टर खोजें" खोलें, डॉक्टर चुनें, तारीख और खाली स्लॉट चुनें और पुष्टि करें। आप ऑनलाइन या (अगर डॉक्टर अनुमति दे) क्लिनिक में भुगतान कर सकते हैं।',
    pa: 'ਬੁੱਕ ਕਰਨ ਲਈ "ਡਾਕਟਰ ਲੱਭੋ" ਖੋਲ੍ਹੋ, ਡਾਕਟਰ ਚੁਣੋ, ਤਾਰੀਖ ਅਤੇ ਖਾਲੀ ਸਲਾਟ ਚੁਣੋ ਅਤੇ ਪੁਸ਼ਟੀ ਕਰੋ। ਤੁਸੀਂ ਆਨਲਾਈਨ ਜਾਂ (ਜੇ ਡਾਕਟਰ ਇਜਾਜ਼ਤ ਦੇਵੇ) ਕਲੀਨਿਕ ਵਿੱਚ ਭੁਗਤਾਨ ਕਰ ਸਕਦੇ ਹੋ।',
    links: [{ label: 'Find a Doctor', to: '/find-doctor' }],
  },
  {
    keys: ['cancel', 'refund policy', 'how refund', 'रद्द', 'ਰੱਦ'],
    en: 'Open your dashboard and press Cancel. You will see the exact refund first. Currently: 24+ hours before = 100%, 2 to 24 hours = 50%, under 2 hours = 0%. If the doctor cancels, you get a full refund. Refund time depends on your bank.',
    hi: 'डैशबोर्ड में "Cancel" दबाएँ; पहले आपको सटीक रिफंड दिखेगा। अभी: 24 घंटे या अधिक पहले 100%, 2 से 24 घंटे 50%, 2 घंटे से कम 0%। डॉक्टर रद्द करे तो पूरा रिफंड मिलता है। रिफंड कब पहुँचेगा यह आपके बैंक पर निर्भर है।',
    pa: 'ਡੈਸ਼ਬੋਰਡ ਵਿੱਚ "Cancel" ਦਬਾਓ; ਪਹਿਲਾਂ ਤੁਹਾਨੂੰ ਸਹੀ ਰਿਫੰਡ ਦਿਖੇਗਾ। ਹੁਣ: 24 ਘੰਟੇ ਜਾਂ ਵੱਧ ਪਹਿਲਾਂ 100%, 2 ਤੋਂ 24 ਘੰਟੇ 50%, 2 ਘੰਟੇ ਤੋਂ ਘੱਟ 0%। ਡਾਕਟਰ ਰੱਦ ਕਰੇ ਤਾਂ ਪੂਰਾ ਰਿਫੰਡ ਮਿਲਦਾ ਹੈ। ਰਿਫੰਡ ਕਦੋਂ ਪਹੁੰਚੇਗਾ ਇਹ ਤੁਹਾਡੇ ਬੈਂਕ ਉੱਤੇ ਨਿਰਭਰ ਹੈ।',
    links: [{ label: 'My dashboard', to: '/dashboard' }],
  },
  {
    keys: ['reschedule', 'change my appointment', 'change the time'],
    en: 'On your dashboard press Reschedule on a confirmed appointment and pick a new slot. It must be at least 2 hours before the appointment, up to 2 times.',
    links: [{ label: 'My dashboard', to: '/dashboard' }],
  },
  {
    keys: ['delivery', 'shipping'],
    en: 'Delivery is free on orders of ₹499 or more, and ₹40 below that. You can cancel an order until it is shipped.',
    links: [{ label: 'Buy Medicines', to: '/buy-medicines' }],
  },
  {
    keys: ['prescription'],
    en: 'Prescription medicines need an uploaded prescription that an admin approves. Upload it at checkout; once approved you can place the order.',
    links: [{ label: 'My cart', to: '/cart' }],
  },
  {
    keys: ['register as a doctor', 'join as a doctor', 'doctor registration', 'doctor register'],
    en: 'Doctors can register from the doctor registration page. An admin verifies the application, and then you appear in Find a Doctor.',
    links: [{ label: 'Register as a doctor', to: '/doctor/register' }],
  },
];

const EMERGENCY = /(chest pain|heart attack|can'?t breathe|cannot breathe|difficulty breathing|unconscious|severe bleeding|suicid|stroke|overdose|poison|seizure|सीने में दर्द|साँस नहीं|ਛਾਤੀ ਵਿੱਚ ਦਰਦ|ਸਾਹ ਨਹੀਂ)/i;
const ADVICE = /(diagnos|prescribe|which medicine|what medicine|medicine for|dose|dosage|do i have|am i suffering|दवा बताओ|कौन सी दवा|ਕਿਹੜੀ ਦਵਾਈ)/i;
const RE_REFUND = /(my|status|where).*refund|refund.*(status|my)/i;
const RE_APPT = /(my|status).*(appointment|booking)|(appointment|booking).*(status)/i;
const RE_ORDER = /(my|status|track).*order|order.*(status|track)/i;
const WANT_DOC = /(doctor|specialist|डॉक्टर|ਡਾਕਟਰ)/i;
const WANT_MED = /(medicine|tablet|syrup|vitamin|capsule|cream|shampoo|supplement|paracetamol|ibuprofen|buy|दवा|दवाई|ਦਵਾਈ)/i;
const MSTOP = new Set(['find', 'show', 'search', 'buy', 'medicine', 'medicines', 'tablet', 'tablets', 'need', 'want', 'any', 'for', 'the', 'some', 'please', 'and', 'with']);

const SYSTEM =
  "You are MediCare's website help assistant. Only help with using the website: finding doctors, booking, cancelling, medicines, orders and refunds. Never diagnose, prescribe or give medical advice. For health concerns suggest seeing a doctor via Find a Doctor, and for emergencies say to call 112. Never invent doctors, prices, slots or order data; if you cannot see it, point to the relevant page. Keep answers under 80 words. Reply in the user's language (English, Hindi or Punjabi).";

const optionalUser = async (req) => {
  try {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) return null;
    const d = jwt.verify(h.slice(7), process.env.JWT_SECRET);
    const u = await User.findById(d.id);
    return u && u.isActive ? u : null;
  } catch {
    return null;
  }
};

async function askLLM(message) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'claude-sonnet-5-5',
        max_tokens: 300,
        system: SYSTEM,
        messages: [{ role: 'user', content: message }],
      }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.content?.[0]?.text || null;
  } catch {
    return null;
  }
}

async function findDoctors(message) {
  const cities = await Doctor.distinct('clinic.city', { status: 'approved' });
  const p = parseQuery(message, cities);
  const filter = { status: 'approved' };
  if (p.specialization) filter.specialization = p.specialization;
  if (p.city) filter['clinic.city'] = p.city;
  if (!p.specialization && !p.city) {
    const names = p.nameTokens.filter((w) => w.length >= 3);
    if (!names.length) return [];
    filter.$or = names.map((w) => ({ name: new RegExp(escapeRegex(w), 'i') }));
  }
  const list = await Doctor.find(filter)
    .sort({ 'rating.value': -1 })
    .limit(4)
    .select('name specialization clinic.city consultationFee experienceYears isDemo');
  const avail = new Set(
    (await doctorIdsAvailable({ _id: { $in: list.map((d) => d._id) } }, 'week')).map(String)
  );
  return list.map((d) => ({
    _id: d._id, name: d.name, specialization: d.specialization, city: d.clinic.city,
    fee: d.consultationFee, years: d.experienceYears, isDemo: d.isDemo,
    availableThisWeek: avail.has(String(d._id)),
  }));
}

async function findProducts(t) {
  const words = t.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !MSTOP.has(w));
  const filter = { status: 'approved' };
  if (words.length) filter.$or = words.map((w) => ({ name: new RegExp(escapeRegex(w), 'i') }));
  let list = await Product.find(filter).sort({ stock: -1 }).limit(4).select('name price stock requiresPrescription');
  let matched = true;
  if (!list.length) {
    matched = false;
    list = await Product.find({ status: 'approved' }).limit(4).select('name price stock requiresPrescription');
  }
  return { list, matched };
}

// POST /api/assistant   body: { message, lang }   (login zaroori nahi, status ke liye zaroori)
export const ask = asyncHandler(async (req, res) => {
  const message = String(req.body.message || '').trim().slice(0, 300);
  const lang = ['en', 'hi', 'pa'].includes(req.body.lang) ? req.body.lang : 'en';
  if (!message) return res.status(400).json({ message: 'Please type a message' });
  const t = message.toLowerCase();
  const L = (o) => o[lang] || o.en;

  if (EMERGENCY.test(t)) return res.json({ reply: L(TXT.emergency) });

  // Status: sirf login kiye hue patient ka asli data
  const asksStatus = RE_REFUND.test(t) || RE_APPT.test(t) || RE_ORDER.test(t);
  if (asksStatus) {
    const user = await optionalUser(req);
    if (!user || user.role !== 'patient')
      return res.json({ reply: L(TXT.login), links: [{ label: 'Login', to: '/login' }] });

    if (RE_REFUND.test(t)) {
      const list = await Refund.find({ patient: user._id }).sort({ createdAt: -1 }).limit(3);
      return res.json({
        reply: list.length
          ? `${list.map((r) => `₹${r.amount} for ${r.sourceType}: ${r.status}`).join('\n')}\nHow soon it reaches you depends on your bank.`
          : 'You have no refunds.',
        links: [{ label: 'Payment history', to: '/payments' }],
      });
    }
    if (RE_APPT.test(t)) {
      const list = await Appointment.find({
        patient: user._id, status: { $in: ['confirmed', 'held'] }, date: { $gte: istToday() },
      }).sort({ date: 1, startTime: 1 }).limit(3).populate('doctor', 'name');
      return res.json({
        reply: list.length
          ? list.map((a) => `${a.doctor?.name} on ${a.date} at ${a.startTime} (${a.status === 'held' ? 'awaiting payment' : 'confirmed'})`).join('\n')
          : 'You have no upcoming appointments.',
        links: [{ label: 'My appointments', to: '/dashboard' }],
      });
    }
    const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(3);
    return res.json({
      reply: orders.length
        ? orders.map((o) => `${o.orderNo}: ${o.status}, payment ${o.paymentStatus}`).join('\n')
        : 'You have no orders yet.',
      links: [{ label: 'My orders', to: '/orders' }],
    });
  }

  if (ADVICE.test(t)) {
    return res.json({ reply: L(TXT.advice), links: [{ label: 'Find a Doctor', to: '/find-doctor' }] });
  }

  const faq = FAQ.find((f) => f.keys.some((k) => t.includes(k)));
  if (faq) return res.json({ reply: faq[lang] || faq.en, links: faq.links });

  // Medicine
  if (WANT_MED.test(t) && !WANT_DOC.test(t)) {
    const { list, matched } = await findProducts(t);
    return res.json({
      reply: matched ? 'Here are some matching products:' : 'I could not find that exactly. Here are some products:',
      products: list.map((p) => ({ _id: p._id, name: p.name, price: p.price, inStock: p.stock > 0, rx: p.requiresPrescription })),
      links: [{ label: 'Browse all medicines', to: '/buy-medicines' }],
    });
  }

  // Doctor
  const doctors = await findDoctors(message);
  if (doctors.length) {
    return res.json({
      reply: 'Here are approved doctors that match. Open a profile to see real slots.',
      doctors,
      links: [
        { label: 'See all results', to: `/find-doctor?q=${encodeURIComponent(message)}` },
        { label: 'View on map', to: '/map' },
      ],
    });
  }
  if (WANT_DOC.test(t))
    return res.json({ reply: 'I could not find a matching doctor. Try another spelling or city.', links: [{ label: 'Find a Doctor', to: '/find-doctor' }] });

  const ai = await askLLM(message);
  res.json({ reply: ai || L(TXT.fallback) });
});