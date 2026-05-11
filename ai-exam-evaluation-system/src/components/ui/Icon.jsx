import P from "../../constants/icons";

const Icon = ({ name, size = 18, color = "currentColor", sw = 1.8 }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round"
  >
    <path d={P[name]} />
  </svg>
);

export default Icon;
