import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Restore theme from localStorage
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
}

// Restore language direction
const savedLang = localStorage.getItem('language');
if (savedLang === 'en') {
  document.documentElement.dir = 'ltr';
}

createRoot(document.getElementById("root")!).render(<App />);
