import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Badge from "../../components/ui/Badge";

describe("Badge", () => {
  it("renders the provided text", () => {
    render(<Badge text="Passed" />);
    expect(screen.getByText("Passed")).toBeInTheDocument();
  });

  it("applies success class for success type", () => {
    const { container } = render(<Badge text="OK" type="success" />);
    expect(container.firstChild).toHaveClass("badge-success");
  });

  it("applies danger class for danger type", () => {
    const { container } = render(<Badge text="Fail" type="danger" />);
    expect(container.firstChild).toHaveClass("badge-danger");
  });

  it("applies gold class for gold type", () => {
    const { container } = render(<Badge text="Average" type="gold" />);
    expect(container.firstChild).toHaveClass("badge-gold");
  });

  it("defaults to info class when no type is provided", () => {
    const { container } = render(<Badge text="Info" />);
    expect(container.firstChild).toHaveClass("badge-info");
  });

  it("falls back to info class for unknown type", () => {
    const { container } = render(<Badge text="Unknown" type="nonexistent" />);
    expect(container.firstChild).toHaveClass("badge-info");
  });
});
