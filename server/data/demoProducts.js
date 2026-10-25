// Sab DEMO data hai. Real products aane par seed:demo:remove se hat jayega.
export const demoProducts = [
  { name: 'Paracetamol 500mg', desc: 'Relief from fever and mild pain. Strip of 15 tablets.', category: 'pain-relief', brand: 'DemoPharma', price: 30, mrp: 35, stock: 200, rx: false, icon: '💊' },
  { name: 'Ibuprofen 400mg', desc: 'Anti-inflammatory for aches and swelling.', category: 'pain-relief', brand: 'DemoPharma', price: 45, mrp: 55, stock: 150, rx: false, icon: '💊' },
  { name: 'Pain Relief Spray', desc: 'Fast-acting topical spray for muscle pain.', category: 'pain-relief', brand: 'DemoCare', price: 160, mrp: 199, stock: 60, rx: false, icon: '🧴' },
  { name: 'Vitamin C 500mg', desc: 'Immunity support chewable tablets, 60 count.', category: 'vitamins', brand: 'DemoVita', price: 220, mrp: 275, stock: 120, rx: false, icon: '🍊' },
  { name: 'Vitamin D3 60K', desc: 'Weekly vitamin D3 capsules, pack of 4.', category: 'vitamins', brand: 'DemoVita', price: 130, mrp: 150, stock: 90, rx: false, icon: '☀️' },
  { name: 'Cough Syrup 100ml', desc: 'Soothing herbal cough syrup.', category: 'cold-and-fever', brand: 'DemoHerbal', price: 95, mrp: 110, stock: 80, rx: false, icon: '🍯' },
  { name: 'Cetirizine 10mg', desc: 'Allergy and cold relief, strip of 10.', category: 'cold-and-fever', brand: 'DemoPharma', price: 25, mrp: 30, stock: 3, rx: false, icon: '💊' },
  { name: 'Antacid Gel 170ml', desc: 'Quick relief from acidity and gas.', category: 'digestive', brand: 'DemoCare', price: 110, mrp: 125, stock: 70, rx: false, icon: '🫧' },
  { name: 'ORS Electrolyte Powder', desc: 'Oral rehydration, pack of 5 sachets.', category: 'digestive', brand: 'DemoCare', price: 75, mrp: 90, stock: 100, rx: false, icon: '🥤' },
  { name: 'Whey Protein 1kg', desc: 'Chocolate flavour protein supplement.', category: 'supplements', brand: 'DemoFit', price: 1899, mrp: 2499, stock: 25, rx: false, icon: '💪' },
  { name: 'Omega-3 Fish Oil', desc: '1000mg capsules, 60 count.', category: 'supplements', brand: 'DemoFit', price: 450, mrp: 599, stock: 0, rx: false, icon: '🐟' },
  { name: 'Moisturising Lotion 200ml', desc: 'Daily hydration for dry skin.', category: 'skincare', brand: 'DemoSkin', price: 240, mrp: 299, stock: 55, rx: false, icon: '🧴' },
  { name: 'Sunscreen SPF 50', desc: 'Broad spectrum, non-greasy, 50g.', category: 'skincare', brand: 'DemoSkin', price: 399, mrp: 475, stock: 40, rx: false, icon: '🌞' },
  { name: 'Anti-Dandruff Shampoo', desc: 'Gentle daily shampoo, 180ml.', category: 'haircare', brand: 'DemoHair', price: 210, mrp: 250, stock: 65, rx: false, icon: '💆' },
  { name: 'Coconut Hair Oil 200ml', desc: 'Pure cold-pressed coconut oil.', category: 'oils', brand: 'DemoNatural', price: 120, mrp: 140, stock: 85, rx: false, icon: '🥥' },
  { name: 'Sanitary Pads (Pack of 20)', desc: 'Ultra-soft, regular size.', category: 'sanitary', brand: 'DemoCare', price: 140, mrp: 160, stock: 75, rx: false, icon: '🩹' },
  { name: 'Toothpaste 150g', desc: 'Fluoride toothpaste for cavity protection.', category: 'personal-care', brand: 'DemoCare', price: 95, mrp: 105, stock: 140, rx: false, icon: '🪥' },
  // Prescription wali: checkout block test karne ke liye
  { name: 'Amoxicillin 500mg', desc: 'Antibiotic. Prescription required.', category: 'cold-and-fever', brand: 'DemoPharma', price: 120, mrp: 140, stock: 50, rx: true, icon: '💊' },
  { name: 'Metformin 500mg', desc: 'Diabetes medicine. Prescription required.', category: 'digestive', brand: 'DemoPharma', price: 40, mrp: 48, stock: 60, rx: true, icon: '💊' },
];