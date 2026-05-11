import "./Breadcrumb.css";

const Breadcrumb = ({ items }) => (
  <div className="breadcrumb">
    {items.map((item, i) => (
      <span key={i} className="breadcrumb-item-wrap" style={{ display:"flex", alignItems:"center", gap:"6px" }}>
        {i > 0 && <span className="breadcrumb-sep">›</span>}
        <span className={`breadcrumb-item${i === items.length - 1 ? " active" : ""}`}>
          {item}
        </span>
      </span>
    ))}
  </div>
);

export default Breadcrumb;
