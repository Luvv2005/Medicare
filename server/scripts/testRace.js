const API = process.env.API_URL || 'http://localhost:5000/api';

const call = async (path, options = {}, token) => {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  let data = null;
  try { data = await res.json(); } catch { /* no json */ }
  return { status: res.status, data };
};

const getToken = async (email, name) => {
  let r = await call('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'Test1234' }) });
  if (r.status !== 200) {
    r = await call('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password: 'Test1234' }) });
  }
  if (!r.data?.token) throw new Error(`Could not get token for ${email}: ${r.data?.message}`);
  return r.data.token;
};

const run = async () => {
  const tokenA = await getToken('race.a@test.com', 'Race Patient A');
  const tokenB = await getToken('race.b@test.com', 'Race Patient B');

  const list = await call('/doctors?q=simran');
  const doctor = list.data?.doctors?.[0];
  if (!doctor) throw new Error('Demo doctor not found. Run: npm run seed:demo');

  // Agle 7 din mein pehla available in-person slot dhundo
  let target = null;
  for (let i = 1; i <= 7 && !target; i++) {
    const date = new Date(Date.now() + i * 86400000).toISOString().slice(0, 10);
    const r = await call(`/doctors/${doctor._id}/slots?date=${date}&mode=in-person`);
    const free = r.data?.slots?.find((s) => s.available);
    if (free) target = { date, startTime: free.startTime };
  }
  if (!target) throw new Error('No free slot found');

  console.log(`Doctor: ${doctor.name} | Slot: ${target.date} ${target.startTime}`);
  console.log('Both patients book at the SAME moment...');

  const body = (name) => JSON.stringify({
    doctorId: doctor._id, ...target, mode: 'in-person', paymentMethod: 'clinic',
    patientName: name, patientPhone: '9876543210',
  });

  const [a, b] = await Promise.all([
    call('/appointments', { method: 'POST', body: body('Race Patient A') }, tokenA),
    call('/appointments', { method: 'POST', body: body('Race Patient B') }, tokenB),
  ]);

  console.log(`Patient A: ${a.status} - ${a.data?.message}`);
  console.log(`Patient B: ${b.status} - ${b.data?.message}`);

  const statuses = [a.status, b.status].sort();
  if (statuses[0] === 201 && statuses[1] === 409) {
    console.log('\nPASS: exactly one booking succeeded, the other was rejected.');
  } else {
    console.log('\nFAIL: expected one 201 and one 409.');
    process.exitCode = 1;
  }
};

run().catch((e) => { console.error(e.message); process.exitCode = 1; });