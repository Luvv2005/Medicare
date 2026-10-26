import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import BuyMedicines from './pages/BuyMedicines';
import ProductDetail from './pages/ProductDetail';
import FindDoctor from './pages/FindDoctor';
import DoctorProfile from './pages/DoctorProfile';
import Categories from './pages/Categories';
import Chat from './pages/Chat';
import About from './pages/About';
import Faq from './pages/Faq';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import Login from './pages/Login';
import DoctorRegister from './pages/DoctorRegister';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import PaymentHistory from './pages/PaymentHistory';
import Notifications from './pages/Notifications';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/buy-medicines" element={<BuyMedicines />} />
          <Route path="/medicines/:id" element={<ProductDetail />} />
          <Route path="/find-doctor" element={<FindDoctor />} />
          <Route path="/doctors/:id" element={<DoctorProfile />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/doctor/register" element={<DoctorRegister />} />

          {/* Login zaroori */}
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

          {/* Sirf patient */}
          <Route path="/checkout" element={<ProtectedRoute roles={['patient']}><Checkout /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute roles={['patient']}><Orders /></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute roles={['patient']}><PaymentHistory /></ProtectedRoute>} />

          {/* Sirf admin */}
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />

          <Route path="*" element={<div className="container py-4 text-center">404 - Page not found</div>} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}