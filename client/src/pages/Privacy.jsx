import LegalPage from '../components/LegalPage';

const SECTIONS = [
  { title: 'Information we collect', text: 'Your name, email, phone number and saved address; details of appointments and orders you make; prescriptions and files you upload; messages you send to doctors; and, for doctors, professional details, clinic details and verification documents. We do not store your card or UPI details; payments are handled by our payment gateway.' },
  { title: 'How we use it', text: 'To run your account, book appointments, deliver orders, verify prescriptions, send notifications and emails about them, process payments and refunds, and keep the platform safe.' },
  { title: 'Who can see it', text: 'A doctor sees only the details of patients who booked with them. Chat messages and attachments are visible only to the two people in that conversation. Prescriptions are visible to you and to administrators who verify them. Administrators can access data needed to operate the platform. We do not sell your personal information.' },
  { title: 'Service providers', text: 'We use service providers to run the platform: a payment gateway for online payments and refunds, an email service to send codes and updates, cloud hosting and a database provider to store data. They process data only to provide those services.' },
  { title: 'Emails', text: 'We send verification and password-reset codes, and short update emails about bookings, orders and refunds. These update emails contain only a title and a login link, not the details.' },
  { title: 'Location', text: 'Your location is used only when you choose to find nearby doctors. It is sent to find results and is not saved to your profile. Doctors may save their clinic location to appear on the map.' },
  { title: 'Security', text: 'Passwords are stored as secure hashes. Access is controlled by role on the server, private files are not publicly accessible, and sensitive actions by administrators are logged.' },
  { title: 'Browser storage', text: 'Your browser stores a login token and your display preferences such as theme, language and text size, so you stay signed in and your settings are remembered.' },
  { title: 'Your choices', text: 'You can edit your name, phone number and address from your profile. To ask for your data to be corrected or deleted, contact support.' },
  { title: 'Medical information', text: 'MediCare is not a substitute for professional medical advice, diagnosis or treatment.' },
  { title: 'Changes', text: 'We may update this policy and will show the latest version on this page.' },
];

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="How MediCare handles your information."
      sections={SECTIONS}
    />
  );
}