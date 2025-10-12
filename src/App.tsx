import "./App.css";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import ContactPage from "./pages/contact";
import ActivitiesPage from "./pages/activities";
import NewsletterPage from "./pages/newsletter";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="*" element={<Home />} />
        <Route path="/activities" element={<ActivitiesPage />} />
        <Route path="/newsletter" element={<NewsletterPage />} />
      </Routes>
    </>
  );
}

export default App;
