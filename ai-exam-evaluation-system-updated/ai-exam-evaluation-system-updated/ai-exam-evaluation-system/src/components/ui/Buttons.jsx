import "./Buttons.css";

export const GoldBtn = ({ children, onClick, style = {} }) => (
  <button className="btn-gold" onClick={onClick} style={style}>
    {children}
  </button>
);

export const OutlineBtn = ({ children, onClick, style = {} }) => (
  <button className="btn-outline" onClick={onClick} style={style}>
    {children}
  </button>
);

export const Pill = ({ label, active, onClick }) => (
  <button
    className={`btn-pill ${active ? "btn-pill-active" : "btn-pill-inactive"}`}
    onClick={onClick}
  >
    {label}
  </button>
);
