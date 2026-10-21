import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import BuyMedicines from './pages/BuyMedicines';
import FindDoctor from './pages/FindDoctor';
import Categories from './pages/Categories';
import Chat from './pages/Chat';
import About from './pages/About';
import Cart from './pages/Cart';
import Login from './pages/Login';

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/buy-medicines" element={<BuyMedicines />} />
          <Route path="/find-doctor" element={<FindDoctor />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/about" element={<About />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<div className="container py-4">404 - Page not found</div>} />
        </Routes>
      </main>
    </>
  );
}