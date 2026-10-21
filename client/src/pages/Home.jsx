import { useEffect, useState } from 'react';
import { apiGet } from '../services/api';

export default function Home() {
  const [status, setStatus] = useState('Checking backend...');

  useEffect(() => {
    apiGet('/health')
      .then((data) => setStatus(`✅ ${data.message}`))
      .catch(() => setStatus('❌ Backend not reachable'));
  }, []);

  return (
    <div className="container py-4">
      <div className="mc-card">
        <h1>Welcome to MediCare</h1>
        <p className="mc-muted">Find doctors, book appointments and order medicines.</p>
        <p className="mb-0">
          <strong>Backend status:</strong> {status}
        </p>
      </div>
    </div>
  );
}