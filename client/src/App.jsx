import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import BuyMedicines from './pages/BuyMedicines';
import FindDoctor from './pages/FindDoctor';
import Categories from './pages/Categories';
import Chat from './pages/Chat';
import About from './pages/About';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import DoctorProfile from './pages/DoctorProfile';
import DoctorRegister from './pages/DoctorRegister';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/buy-medicines" element={<BuyMedicines />} />
          <Route path="/find-doctor" element={<FindDoctor />} />
          <Route path="/doctors/:id" element={<DoctorProfile />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/about" element={<About />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/doctor/register" element={<DoctorRegister />} />

          {/* Login zaroori */}
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/medicines/:id" element={<ProductDetail />} 
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute roles={['patient']}>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute roles={['patient']}>
                <Orders />
              </ProtectedRoute>
            }
          />
          
          {/* Sirf admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<div className="container py-4">404 - Page not found</div>} />
        </Routes>
      </main>
    </>
  );
}