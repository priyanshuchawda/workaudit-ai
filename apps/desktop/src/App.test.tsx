import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import App from "./App";

test("renders the WorkTrace desktop shell status panels", () => {
  render(<App />);

  expect(screen.getByRole("heading", { name: "WorkTrace AI" })).toBeInTheDocument();
  expect(screen.getByText("Local-first desktop shell")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Recorder" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Local agent" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Privacy" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Evidence" })).toBeInTheDocument();
});
