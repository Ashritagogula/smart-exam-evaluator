import "./Card.css";

export const Card = ({ children, title, action, style = {} }) => (
  <div className="card" style={style}>
    {title && (
      <div className="card-header">
        <span className="card-header-title">{title}</span>
        {action}
      </div>
    )}
    <div className="card-body">{children}</div>
  </div>
);

export const Divider = () => <div className="divider" />;

export const AUTable = ({ cols, children }) => (
  <table className="au-table">
    <thead>
      <tr>
        {cols.map((c) => (
          <th key={c}>{c}</th>
        ))}
      </tr>
    </thead>
    <tbody>{children}</tbody>
  </table>
);
