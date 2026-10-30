import LegalPage from '../components/LegalPage';

const SECTIONS = [
  { title: 'Using MediCare', text: 'You must give accurate information and use the platform lawfully. You are responsible for activity on your account.' },
  { title: 'Doctors', text: 'Doctors are independent professionals. MediCare reviews applications before listing a doctor but is not the provider of medical care.' },
  { title: 'Not for emergencies', text: 'MediCare does not provide emergency or diagnostic services. In an emergency, call 112 or go to the nearest hospital.' },
  { title: 'Appointments and cancellation', text: 'Refunds for cancelled appointments follow the cancellation policy shown before you confirm a cancellation. If a doctor cancels, an online payment is refunded in full. Appointments can be rescheduled within the limits shown in the app.' },
  { title: 'Payments and refunds', text: 'Online payments are processed by a third-party payment gateway. Approved refunds are started promptly, but when they reach you depends on your bank or payment provider.' },
  { title: 'Medicines', text: 'Prescription medicines require a valid prescription that is verified before the order is placed. Always read the label and consult a doctor or pharmacist before use. Product information on the site is not medical advice.' },
  { title: 'Acceptable use', text: 'Do not misuse the platform, attempt to access other accounts, upload harmful or unlawful content, or submit false information, including false doctor credentials or prescriptions.' },
  { title: 'Accounts', text: 'We may suspend accounts that break these terms or put other users at risk.' },
  { title: 'Limitation of liability', text: 'To the extent permitted by law, MediCare is not liable for medical outcomes or for losses caused by events outside our reasonable control.' },
  { title: 'Changes', text: 'We may update these terms. Continued use after an update means you accept the new terms.' },
];

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="The rules for using MediCare."
      sections={SECTIONS}
    />
  );
}