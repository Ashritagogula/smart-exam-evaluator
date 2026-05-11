import "./Charts.css";
import C from "../../constants/colors";

/* ── Bar Chart ── */
export const BarChart = ({ data, color = C.navy }) => {
  const max = Math.max(...data.map((d) => d.v));
  return (
    <div className="bar-chart">
      {data.map((d, i) => (
        <div key={i} className="bar-chart-col">
          <div
            className="bar-chart-bar"
            style={{
              height: `${(d.v / max) * 72}px`,
              background: `linear-gradient(180deg, ${color}, ${color}bb)`,
            }}
          />
          <span className="bar-chart-label">{d.l}</span>
        </div>
      ))}
    </div>
  );
};

/* ── Donut Chart ── */
export const DonutChart = ({ pct, color, size = 80, label }) => {
  const r = 28, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox="0 0 70 70">
        <circle cx="35" cy="35" r={r} fill="none" stroke={C.borderLight} strokeWidth="7" />
        <circle
          cx="35" cy="35" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ / 4} strokeLinecap="round"
        />
        <text x="35" y="40" textAnchor="middle" fill={C.text} fontSize="12" fontWeight="800">
          {pct}%
        </text>
      </svg>
      {label && <span className="donut-label">{label}</span>}
    </div>
  );
};

/* ── Line Sparkline ── */
export const LineSparkline = ({ data, color = C.blue }) => {
  const mx = Math.max(...data), mn = Math.min(...data);
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - mn) / (mx - mn + 1)) * 85}`)
    .join(" ");
  return (
    <svg className="sparkline-wrap" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polygon points={`${pts} 100,100 0,100`} fill={color} opacity="0.12" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" />
    </svg>
  );
};

/* ── Progress Bar ── */
export const ProgressBar = ({ val, max, color = C.navy, label, showPct = true }) => (
  <div className="progress-wrap">
    {label && (
      <div className="progress-header">
        <span className="progress-label">{label}</span>
        {showPct && <span className="progress-pct">{Math.round((val / max) * 100)}%</span>}
      </div>
    )}
    <div className="progress-track">
      <div
        className="progress-fill"
        style={{ width: `${(val / max) * 100}%`, background: color }}
      />
    </div>
  </div>
);
