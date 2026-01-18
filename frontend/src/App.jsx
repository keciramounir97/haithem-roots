import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

// ===== PUBLIC PAGES =====
import Home from "./pages/home";
import GalleryPage from "./pages/gallery";
import Periods from "./pages/periods";
import SourcesAndArchives from "./pages/SourcesAndArchives";

// ===== AUTH PAGES =====
import Login from "./pages/login";
import Signup from "./pages/signup";
import ResetPassword from "./pages/resetpassword";

// ===== ERROR =====
import ErrorPage from "./pages/error";

// ===== ADMIN =====
import AdminLayout from "./admin/AdminLayout";
import ProtectedRoute from "./admin/components/protectedRoute";

import Dashboard from "./admin/pages/Dashboard";
import Trees from "./admin/pages/Trees";
import AdminGallery from "./admin/pages/Gallery";
import AdminBooks from "./admin/pages/Books";
import Settings from "./admin/pages/Settings";
import ActivityLog from "./admin/pages/ActivityLog";

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      easing: "ease-out-cubic",
      offset: 50,
    });
  }, []);

  return (
    <>
      {/* Hide Navbar in Admin */}
      {!isAdminRoute && <Navbar />}

      <Routes>
        {/* ===== PUBLIC ROUTES ===== */}
        <Route path="/" element={<Home />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/library" element={<GalleryPage />} />
        <Route path="/periods" element={<Periods />} />
        {/* Unified Sources & Archives page - replaces Archives, Sources, and AccessReliability */}
        <Route path="/archives" element={<SourcesAndArchives />} />
        <Route path="/sources" element={<SourcesAndArchives />} />
        <Route path="/access-reliability" element={<SourcesAndArchives />} />
        <Route path="/sourcesandarchives" element={<SourcesAndArchives />} />

        {/* ===== AUTH ROUTES ===== */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/resetpassword" element={<ResetPassword />} />

        {/* ===== ADMIN ROUTES (PROTECTED) ===== */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="trees" element={<Trees />} />
          <Route path="gallery" element={<AdminGallery />} />
          <Route path="books" element={<AdminBooks />} />
          <Route path="settings" element={<Settings />} />
          <Route path="activity" element={<ActivityLog />} />
        </Route>

        {/* ===== FALLBACK ===== */}
        <Route path="*" element={<ErrorPage />} />
      </Routes>

      {!isAdminRoute && <Footer />}
    </>
  );
}

export default App;
