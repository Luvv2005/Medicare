import LegalPage from '../components/LegalPage';

const SECTIONS = [
  { title: 'Information we collect', text: 'Your name, email, phone number and saved address; details of appointments and orders you make; and, for doctors, professional and clinic details. We do not store your card or UPI details.' },
  { title: 'How we use it', text: 'To run your account, book appointments, deliver orders, send notifications about them, process refunds, and keep the platform safe.' },
  { title: 'Who can see it', text: 'A doctor sees only the details of patients who booked with them. Administrators can access data needed to operate the platform. We do not sell your personal information.' },
  { title: 'Location', text: 'Your location is used only when you choose to find nearby doctors. It is sent to find results and is not saved to your profile.' },
  { title: 'Security', text: 'Passwords are stored as secure hashes. Access is controlled by role on the server, and sensitive actions by administrators are logged.' },
  { title: 'Browser storage', text: 'Your browser stores a login token and your display preferences such as theme, language and text size, so you stay signed in and your settings are remembered.' },
  { title: 'Your choices', text: 'You can edit your name, phone number and address from your profile. To ask for your data to be deleted, contact support.' },
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