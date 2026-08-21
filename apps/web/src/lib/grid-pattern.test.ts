import { describe, expect, it } from "vitest";

import { GRID_CELL, surroundingCells } from "./grid-pattern";

describe("surroundingCells", () => {
  it("never includes the center and stays inside the radius", () => {
    const cells = surroundingCells(10, 4, 4, 1);
    expect(cells.length).toBeLessThanOrEqual(4);
    expect(cells.some((cell) => cell.x === 10 && cell.y === 4)).toBe(false);
    for (const cell of cells) {
      expect(Math.abs(cell.x - 10)).toBeLessThanOrEqual(1);
      expect(Math.abs(cell.y - 4)).toBeLessThanOrEqual(1);
    }
  });
});

describe("GRID_CELL", () => {
  it("matches the live 32px lattice", () => {
    expect(GRID_CELL).toBe(32);
  });
});
