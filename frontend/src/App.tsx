import { Navigate, Route, Routes } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Photo from "./pages/Photo";
import Camera from "./pages/Camera";
import Catalog from "./pages/Catalog";
import Wardrobe from "./pages/Wardrobe";
import TryOn from "./pages/TryOn";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/register" replace />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/photo" element={<Photo />} />
      <Route path="/camera" element={<Camera />} />
      <Route path="/catalog" element={<Catalog />} />
      <Route path="/wardrobe" element={<Wardrobe />} />
      <Route path="/tryon/:itemId" element={<TryOn />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}