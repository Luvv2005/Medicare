import { closest } from './fuzzy.js';

const STOP_WORDS = new Set([
  'dr', 'doctor', 'doctors', 'specialist', 'specialists', 'near', 'nearby', 'in', 'at',
  'of', 'for', 'a', 'the', 'me', 'best', 'top', 'find', 'need', 'i', 'want', 'to',
  'see', 'around', 'from', 'my',
]);

// Aam shabd -> specialization
const SYNONYMS = {
  skin: 'Dermatologist', derma: 'Dermatologist', dermatologist: 'Dermatologist',
  dermatology: 'Dermatologist', acne: 'Dermatologist', hair: 'Dermatologist',
  heart: 'Cardiologist', cardiologist: 'Cardiologist', cardiology: 'Cardiologist', cardio: 'Cardiologist',
  child: 'Pediatrician', children: 'Pediatrician', kids: 'Pediatrician', baby: 'Pediatrician',
  pediatrician: 'Pediatrician', paediatrician: 'Pediatrician', pediatric: 'Pediatrician',
  bone: 'Orthopedic', joint: 'Orthopedic', ortho: 'Orthopedic', orthopedic: 'Orthopedic',
  orthopaedic: 'Orthopedic', orthopedics: 'Orthopedic',
  gynecologist: 'Gynecologist', gynaecologist: 'Gynecologist', gynae: 'Gynecologist',
  women: 'Gynecologist', pregnancy: 'Gynecologist',
  ent: 'ENT Specialist', ear: 'ENT Specialist', nose: 'ENT Specialist', throat: 'ENT Specialist',
  neurologist: 'Neurologist', neuro: 'Neurologist', brain: 'Neurologist',
  psychiatrist: 'Psychiatrist', mental: 'Psychiatrist', psychiatry: 'Psychiatrist',
  dentist: 'Dentist', dental: 'Dentist', tooth: 'Dentist', teeth: 'Dentist',
  ophthalmologist: 'Ophthalmologist', eye: 'Ophthalmologist',
  urologist: 'Urologist', urology: 'Urologist', kidney: 'Urologist',
  pulmonologist: 'Pulmonologist', lung: 'Pulmonologist', chest: 'Pulmonologist',
  gastroenterologist: 'Gastroenterologist', gastro: 'Gastroenterologist',
  stomach: 'Gastroenterologist', liver: 'Gastroenterologist',
  endocrinologist: 'Endocrinologist', diabetes: 'Endocrinologist',
  thyroid: 'Endocrinologist', hormone: 'Endocrinologist',
  oncologist: 'Oncologist', cancer: 'Oncologist', oncology: 'Oncologist',
  physician: 'General Physician', general: 'General Physician', fever: 'General Physician',
};
const SYNONYM_KEYS = Object.keys(SYNONYMS);

// "skin specialist near barnala" -> { specialization: 'Dermatologist', city: 'Barnala', nameTokens: [] }
export default function parseQuery(q, cities = []) {
  const tokens = String(q)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !STOP_WORDS.has(t));

  let specialization = null;
  let city = null;
  const nameTokens = [];
  const cityLower = cities.map((c) => c.toLowerCase());

  for (const t of tokens) {
    // 1) exact synonym  2) exact city  3) typo synonym  4) typo city  5) otherwise name
    if (!specialization && SYNONYMS[t]) {
      specialization = SYNONYMS[t];
      continue;
    }
    if (!city && cityLower.includes(t)) {
      city = cities[cityLower.indexOf(t)];
      continue;
    }
    if (!specialization) {
      const key = closest(t, SYNONYM_KEYS);
      if (key) {
        specialization = SYNONYMS[key];
        continue;
      }
    }
    if (!city) {
      const c = closest(t, cityLower);
      if (c) {
        city = cities[cityLower.indexOf(c)];
        continue;
      }
    }
    nameTokens.push(t);
  }

  return { specialization, city, nameTokens };
}