import PageHeader from '../components/PageHeader';

const FAQ = [
  { q: 'How do I book an appointment?', a: 'Open Find a Doctor, choose a doctor, pick a date and a free time slot, and confirm. You can pay online or, if the doctor allows it, at the clinic.' },
  { q: 'How do I cancel an appointment and what refund will I get?', a: 'Open your dashboard and press Cancel. Before you confirm, you will see the exact refund. Under the current policy: 24 hours or more before the appointment gives a full refund, 2 to 24 hours gives 50%, and less than 2 hours gives no refund. Appointments paid at the clinic have nothing to refund.' },
  { q: 'What if the doctor cancels?', a: 'You are notified, and an online payment is refunded in full. You also get links to book another slot or find another doctor.' },
  { q: 'How long does a refund take?', a: 'We start the refund immediately, but how long it takes to reach you depends on your bank or payment provider.' },
  // { q: 'Why does a payment say test mode?', a: 'Online payments are currently simulated for development, and no real money is charged.' },
  { q: 'Can I order prescription medicines?', a: 'Not yet. Prescription medicines need prescription upload and verification, which is not available yet. You can still buy non-prescription products.' },
  { q: 'How much is delivery?', a: 'Delivery is free on orders of ₹499 or more, and ₹40 below that.' },
  { q: 'Can I cancel a medicine order?', a: 'Yes, until it is shipped. A paid order is refunded in full.' },
  { q: 'I am a doctor. How do I join?', a: 'Use Register as a doctor and submit your details. An admin reviews your application, and you appear in Find a Doctor after approval. Then set your working hours in your dashboard.' },
  { q: 'Is my information safe?', a: 'Passwords are stored as secure hashes, and access to data is restricted by role. See the Privacy Policy for details.' },
  { q: 'Does MediCare give medical advice?', a: 'No. MediCare connects you with doctors and products. It does not diagnose conditions or replace a qualified doctor. In an emergency, call 112.' },
];

export default function Faq() {
  return (
    <div className="container-xl py-4">
      <PageHeader title="Frequently asked questions" subtitle="Quick answers about booking, refunds and orders." />
      <div className="mc-legal mc-faq">
        {FAQ.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p className="mb-0">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}