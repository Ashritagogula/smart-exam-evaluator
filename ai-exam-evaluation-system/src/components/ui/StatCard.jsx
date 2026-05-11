import Icon from "./Icon";
import "./StatCard.css";

const accentColors = {
  navy:  "#002366",
  blue:  "#0077b6",
  gold:  "#f7941d",
  green: "#0a8a4a",
};

const StatCard = ({ title, value, sub, icon, accent = "navy" }) => {
  const color = accentColors[accent] || accentColors.navy;
  return (
    <div className="stat-card" style={{ borderTopColor: color }}>
      <div>
        <p className="stat-card-label">{title}</p>
        <p className="stat-card-value">{value}</p>
        {sub && <p className="stat-card-sub">{sub}</p>}
      </div>
      <div
        className="stat-card-icon"
        style={{ background: `${color}15`, border: `1px solid ${color}30` }}
      >
        <Icon name={icon} size={20} color={color} />
      </div>
    </div>
  );
};

export default StatCard;
