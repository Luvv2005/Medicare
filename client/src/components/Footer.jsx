import { Link } from 'react-router-dom';
import { SITE } from '../config/site';

export default function Footer() {
  const social = SITE.social.filter((s) => s.url);

  return (
    <footer className="mc-footer">
      <div className="container-xl">
        <div className="row g-4">
          <div className="col-12 col-md-4">
            <Link to="/" className="mc-logo mb-2">
              <span className="mc-logo-icon">+</span> {SITE.name}
            </Link>
            <p className="mc-muted small">
              Find verified doctors, book appointments and order medicines and healthcare products,
              all in one place.
            </p>
            {social.length > 0 && (
              <div className="d-flex flex-wrap gap-3 small">
                {social.map((s) => (
                  <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
                ))}
              </div>
            )}
          </div>

          <div className="col-6 col-md-2">
            <h6>Quick links</h6>
            <ul className="list-unstyled small mb-0">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/find-doctor">Find a Doctor</Link></li>
              <li><Link to="/map">Doctors on map</Link></li>
              <li><Link to="/buy-medicines">Buy Medicines</Link></li>
              <li><Link to="/categories">Categories</Link></li>
              <li><Link to="/about">About Us</Link></li>
            </ul>
          </div>

          <div className="col-6 col-md-2">
            <h6>For doctors</h6>
            <ul className="list-unstyled small mb-0">
              <li><Link to="/doctor/register">Register as a doctor</Link></li>
              <li><Link to="/login">Doctor login</Link></li>
              <li><Link to="/find-doctor?specialization=Dermatologist">Dermatologists</Link></li>
              <li><Link to="/find-doctor?specialization=Cardiologist">Cardiologists</Link></li>
              <li><Link to="/find-doctor?specialization=Pediatrician">Pediatricians</Link></li>
            </ul>
          </div>

          <div className="col-6 col-md-2">
            <h6>Medicines</h6>
            <ul className="list-unstyled small mb-0">
              <li><Link to="/buy-medicines?category=pain-relief">Pain Relief</Link></li>
              <li><Link to="/buy-medicines?category=vitamins">Vitamins</Link></li>
              <li><Link to="/buy-medicines?category=skincare">Skincare</Link></li>
              <li><Link to="/buy-medicines?category=supplements">Supplements</Link></li>
              <li><Link to="/categories">All categories</Link></li>
            </ul>
          </div>

          <div className="col-6 col-md-2">
            <h6>Support</h6>
            <ul className="list-unstyled small mb-0">
              <li><a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a></li>
              <li className="mc-muted">{SITE.supportHours}</li>
              <li><Link to="/faq">FAQ</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <hr />
        <p className="small mc-muted mb-1">
          Information on this site is not a substitute for professional medical advice. In an
          emergency, call 112 or go to the nearest hospital.
        </p>
        <p className="small mc-muted mb-0">
          © {new Date().getFullYear()} {SITE.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}