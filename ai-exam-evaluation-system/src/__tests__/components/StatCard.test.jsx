import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatCard from "../../components/ui/StatCard";

describe("StatCard", () => {
  it("renders the title", () => {
    render(<StatCard title="Total Booklets" value={120} icon="file" />);
    expect(screen.getByText("Total Booklets")).toBeInTheDocument();
  });

  it("renders the value", () => {
    render(<StatCard title="Pass Rate" value="87%" icon="check" />);
    expect(screen.getByText("87%")).toBeInTheDocument();
  });

  it("renders the sub label when provided", () => {
    render(<StatCard title="Avg Score" value={74} sub="out of 100" icon="bar" />);
    expect(screen.getByText("out of 100")).toBeInTheDocument();
  });

  it("does not render sub label when omitted", () => {
    const { container } = render(<StatCard title="Count" value={5} icon="user" />);
    expect(container.querySelector(".stat-card-sub")).toBeNull();
  });

  it("applies the navy border color by default", () => {
    const { container } = render(<StatCard title="T" value={1} icon="x" />);
    expect(container.firstChild).toHaveStyle({ borderTopColor: "#002366" });
  });

  it("applies gold border color when accent is gold", () => {
    const { container } = render(<StatCard title="T" value={1} icon="x" accent="gold" />);
    expect(container.firstChild).toHaveStyle({ borderTopColor: "#f7941d" });
  });
});
