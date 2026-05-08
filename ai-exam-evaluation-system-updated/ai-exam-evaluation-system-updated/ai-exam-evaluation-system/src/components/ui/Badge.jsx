import "./Badge.css";

const typeMap = {
  success: "badge-success",
  warning: "badge-warning",
  danger:  "badge-danger",
  info:    "badge-info",
  gold:    "badge-gold",
  navy:    "badge-navy",
};

const Badge = ({ text, type = "info" }) => (
  <span className={`badge ${typeMap[type] || "badge-info"}`}>{text}</span>
);

export default Badge;
