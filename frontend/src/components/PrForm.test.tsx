import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PrForm } from "./PrForm";

afterEach(cleanup);

describe("PrForm", () => {
  it("submits the trimmed URL that was typed in", () => {
    const onSubmit = vi.fn();
    render(<PrForm loading={false} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/Pull request URL/), {
      target: { value: "  https://github.com/acme/widgets/pull/3  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Evaluate pull request" }));

    expect(onSubmit).toHaveBeenCalledWith("https://github.com/acme/widgets/pull/3");
  });

  it("disables the button and relabels it while loading", () => {
    render(<PrForm loading={true} onSubmit={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Fetching from GitHub…" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
