import {
  Stethoscope, Pill, CalendarCheck, Package, MessageCircle, ShieldCheck, Lock, Undo2, Bell,
  Search, MapPin, ShoppingCart, Star, ClipboardList, Inbox, HeartPulse, Bot, Droplet, Eye, Ear,
  Baby, Flower2, Thermometer, Syringe, Bandage, Leaf, Dumbbell, Sparkles, Brain, Bone, Activity,
  Wind, Droplets, KeyRound, Puzzle, Sun, Moon, BadgeCheck,
} from 'lucide-react';

export const ICONS = {
  stethoscope: Stethoscope, pill: Pill, calendar: CalendarCheck, package: Package,
  chat: MessageCircle, shield: ShieldCheck, lock: Lock, refund: Undo2, bell: Bell,
  search: Search, pin: MapPin, cart: ShoppingCart, star: Star, clipboard: ClipboardList,
  inbox: Inbox, heartpulse: HeartPulse, bot: Bot, droplet: Droplet, eye: Eye, ear: Ear,
  baby: Baby, flower: Flower2, thermometer: Thermometer, syringe: Syringe, bandage: Bandage,
  leaf: Leaf, dumbbell: Dumbbell, sparkles: Sparkles, brain: Brain, bone: Bone,
  activity: Activity, wind: Wind, droplets: Droplets, key: KeyRound, puzzle: Puzzle,
  sun: Sun, moon: Moon, verified: BadgeCheck,
};

// Category slug se icon (kisi bhi nayi category par bhi chalega)
const RULES = [
  [/thermometer/, 'thermometer'],
  [/baby|kids|maternity|pregnan|diaper/, 'baby'],
  [/eye|lens/, 'eye'],
  [/ear-/, 'ear'],
  [/heart|blood-pressure|cholesterol/, 'heartpulse'],
  [/diabet|sugar/, 'droplet'],
  [/protein|fitness|weight/, 'dumbbell'],
  [/vitamin|supplement|herbal|ayurved|immun|snack|nutrition|probiotic|homeo/, 'leaf'],
  [/cold|cough|fever|nasal|throat|allergy|respir|asthma|nebul/, 'wind'],
  [/first-aid|bandage|wound|burn|dressing|antisept/, 'bandage'],
  [/equipment|monitor|oximeter/, 'stethoscope'],
  [/oil/, 'droplets'],
  [/women|mens|menstrual|sanitary|intimate|fertility|sexual/, 'flower'],
  [/sleep|stress/, 'brain'],
  [/bone|joint|muscle|ortho|compression|mobility|elderly|hot-cold|sports|pain/, 'bone'],
  [/mask|glove|sanitizer|disinfect|mosquito/, 'shield'],
  [/skin|acne|sun|lip|body|bath|foot|hand|aging|deodor|hair|beard|shav|dandruff|dental|oral|denture/, 'sparkles'],
];

export const iconNameFor = (slug = '') => {
  const hit = RULES.find(([rx]) => rx.test(slug));
  return hit ? hit[1] : 'pill';
};

export function AppIcon({ name, size = 26 }) {
  const C = ICONS[name] || Pill;
  return <C size={size} strokeWidth={1.75} aria-hidden="true" />;
}

export function CategoryIcon({ slug, size = 26 }) {
  return <AppIcon name={iconNameFor(slug)} size={size} />;
}

// Icon ka gradient box
export function IconBadge({ name, slug, size = 26 }) {
  return (
    <span className="mc-ibadge">
      {slug ? <CategoryIcon slug={slug} size={size} /> : <AppIcon name={name} size={size} />}
    </span>
  );
}