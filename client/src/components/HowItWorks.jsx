import { Link } from 'react-router-dom';
import { IconBadge, AppIcon } from './Icon';

function Step({ n, icon, title, text, children }) {
  return (
    <div className="mc-step">
      <span className="mc-step-num">{n}</span>
      <IconBadge name={icon} size={22} />
      <h6>{title}</h6>
      <p className="mc-muted small mb-0">{text}</p>
      {children && <div className="mc-mini">{children}</div>}
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section className="mc-sec2">
      <div className="mc-sec2-head"><h3>How it works</h3></div>

      <div className="mc-flowbox mc-flowbox--map mb-4">
        <h5 className="mc-flowtitle">For patients</h5>
        <div className="mc-steps mc-steps--6">
          <Step n={1} icon="search" title="Search" text="Find your doctor or medicine, even with a typo.">
            <div className="mc-mini-row"><span>skin specialist near Barnala</span></div>
          </Step>
          <Step n={2} icon="pin" title="Check location" text="See the clinic on the map and get directions.">
            <div className="mc-mini-row"><span>Clinic map pin</span><b>Map</b></div>
          </Step>
          <Step n={3} icon="calendar" title="Book a slot" text="Pick a real free time, online or at the clinic.">
            <div className="mc-mini-row"><span>Today</span><b>10:00 AM</b></div>
            <div className="mc-mini-row"><span>Tomorrow</span><b>2:00 PM</b></div>
          </Step>
          <Step n={4} icon="chat" title="Talk to your doctor" text="Chat, share reports and join calls after booking.">
            <span className="mc-mini-bubble">How can I help?</span>
            <span className="mc-mini-bubble me">Sharing my report</span>
          </Step>
          <Step n={5} icon="cart" title="Shop for medicines" text="Order medicines and track your delivery.">
            <div className="mc-mini-row"><span>Cart</span><b>Order</b></div>
          </Step>
          <Step n={6} icon="star" title="Rate your visit" text="Share feedback after a completed appointment.">
            <div className="mc-stars" style={{ fontSize: '1.1rem' }}>★★★★☆</div>
          </Step>
        </div>
        <div className="mt-4">
          <Link to="/find-doctor" className="btn btn-mc-primary">Find a doctor</Link>
        </div>
      </div>

      <div className="mc-flowbox">
        <h5 className="mc-flowtitle">For doctors</h5>
        <div className="mc-steps mc-steps--4">
          <Step n={1} icon="clipboard" title="Register" text="Complete your profile and clinic details.">
            <div className="mc-mini-bar"><i /></div>
          </Step>
          <Step n={2} icon="verified" title="Get verified" text="An admin reviews your registration and documents.">
            <div className="mc-mini-row"><span>Admin review</span><b>Verified</b></div>
          </Step>
          <Step n={3} icon="inbox" title="Manage requests" text="Handle bookings, cancellations and no-shows.">
            <div className="mc-bar-blue">View requests</div>
            <div className="mc-bar-green">Confirmed</div>
            <div className="mc-bar-red">Past visits</div>
          </Step>
          <Step n={4} icon="stethoscope" title="Care for patients" text="Run your live queue, chat and consult.">
            <div className="mc-mini-row"><span>Live queue</span></div>
            <div className="mc-mini-row"><span>Chat and calls</span></div>
          </Step>
        </div>
        <div className="mt-4">
          <Link to="/doctor/register" className="btn btn-mc-outline">Register as a doctor</Link>
        </div>
      </div>
      <p className="small mc-muted mt-2 mb-0 d-flex align-items-center gap-1">
        <AppIcon name="verified" size={14} /> Illustrations show how the app works; they are not real data.
      </p>
    </section>
  );
}