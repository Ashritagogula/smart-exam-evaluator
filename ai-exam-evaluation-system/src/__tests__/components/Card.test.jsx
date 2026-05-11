import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card, AUTable } from "../../components/ui/Card";

describe("Card", () => {
  it("renders children inside the card body", () => {
    render(<Card><p>Card content</p></Card>);
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("renders the title when provided", () => {
    render(<Card title="Evaluation Summary"><span>body</span></Card>);
    expect(screen.getByText("Evaluation Summary")).toBeInTheDocument();
  });

  it("does not render a header when title is omitted", () => {
    const { container } = render(<Card><span>only body</span></Card>);
    expect(container.querySelector(".card-header")).toBeNull();
  });

  it("renders the action slot alongside the title", () => {
    render(
      <Card title="Results" action={<button>Export</button>}>
        <span>body</span>
      </Card>
    );
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
  });
});

describe("AUTable", () => {
  it("renders column headers", () => {
    render(
      <AUTable cols={["Roll No", "Marks", "Grade"]}>
        <tr><td>21CS001</td><td>78</td><td>A</td></tr>
      </AUTable>
    );
    expect(screen.getByText("Roll No")).toBeInTheDocument();
    expect(screen.getByText("Marks")).toBeInTheDocument();
    expect(screen.getByText("Grade")).toBeInTheDocument();
  });

  it("renders row data", () => {
    render(
      <AUTable cols={["Name"]}>
        <tr><td>John Doe</td></tr>
      </AUTable>
    );
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });
});
