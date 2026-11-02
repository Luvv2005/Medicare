import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SITE } from '../config/site';

function FooterArt() {
  const [ok, setOk] = useState(true);
  if (!ok)
    return (
      <div className="mc-foot-fallback" aria-hidden="true">
        <span>🧑‍⚕️</span><span>🗓️</span><span>🛒</span>
      </div>
    );
  return <img className="mc-foot-art" src="/footer-art.png" alt="" onError={() => setOk(false)} />;
}

export default function Footer() {
  const social = (SITE.social || []).filter((s) => s.url);

  return (
    <footer className="mc-footer">
      <div className="container-xl">
        <div className="row g-4">
          <div className="col-12 col-md-4">
            <FooterArt />
            {social.length > 0 && (
              <div className="d-flex flex-wrap gap-3 small mt-3">
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
              <li><Link to="/buy-medicines?category=skincare">Skin Care</Link></li>
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
        <div className="mc-foot-bottom">
          <p className="small mc-muted mb-1">
            Your health matters to us. MediCare is committed to making quality healthcare more accessible, convenient and reliable.
          </p>
          <p className="small mc-muted mb-0">
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}