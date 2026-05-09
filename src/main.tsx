import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Minimal global styles
const style = document.createElement("style");
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; padding: 0; }
  /* Respect reduced motion */
  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; animation: none !important; }
  }
  /* Number tweening */
  .tween { transition: all 0.3s ease; }
  /* Focus visible */
  :focus-visible { outline: 2px solid #5B8DEF; outline-offset: 2px; }
  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #0B1020; }
  ::-webkit-scrollbar-thumb { background: #1E2D45; border-radius: 3px; }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
