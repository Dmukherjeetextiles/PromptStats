/**
 * environment-engine.test.js
 */
const { JSDOM } = require("jsdom");
const dom = new JSDOM("");
global.window = dom.window;
eval(require("fs").readFileSync("./src/content/engines/environment-engine.js", "utf8"));
const EE = window.EnvironmentEngine;

describe("EnvironmentEngine.calculate", () => {
  test("zero tokens returns all zeros", () => {
    const r = EE.calculate(0);
    expect(r.energy).toBe(0);
    expect(r.co2).toBe(0);
    expect(r.water).toBe(0);
  });

  test("returns positive values for positive token count", () => {
    const r = EE.calculate(100);
    expect(r.energy).toBeGreaterThan(0);
    expect(r.co2).toBeGreaterThan(0);
    expect(r.water).toBeGreaterThan(0);
  });

  test("scales linearly with token count", () => {
    const r100  = EE.calculate(100);
    const r200  = EE.calculate(200);
    expect(r200.energy).toBeCloseTo(r100.energy * 2, 5);
    expect(r200.co2).toBeCloseTo(r100.co2 * 2, 5);
    expect(r200.water).toBeCloseTo(r100.water * 2, 5);
  });

  test("uses research-backed Luccioni et al. 2023 energy coefficient", () => {
    // 1 token → 0.001 Wh
    const { energy } = EE.calculate(1);
    expect(energy).toBeCloseTo(0.001, 4);
  });

  test("uses IEA 2023 grid-average CO₂ coefficient", () => {
    // 1 token → 0.000233 gCO₂eq
    const { co2 } = EE.calculate(1);
    expect(co2).toBeCloseTo(0.000233, 5);
  });

  test("uses Li et al. 2023 water coefficient", () => {
    // 1 token → 0.0009 mL
    const { water } = EE.calculate(1);
    expect(water).toBeCloseTo(0.0009, 5);
  });

  test("returns numbers with max 6 decimal places", () => {
    const r = EE.calculate(7); // prime — exercises rounding
    expect(String(r.energy).replace(/.*\./, "").length).toBeLessThanOrEqual(6);
    expect(String(r.co2).replace(/.*\./, "").length).toBeLessThanOrEqual(6);
  });
});

describe("EnvironmentEngine.equivalences", () => {
  test("returns non-negative equivalences for positive totals", () => {
    const eq = EE.equivalences({ co2: 10, water: 50 });
    expect(eq.carMeters).toBeGreaterThanOrEqual(0);
    expect(eq.waterDrops).toBeGreaterThanOrEqual(0);
  });

  test("equivalences scale proportionally", () => {
    const eq1 = EE.equivalences({ co2: 10, water: 100 });
    const eq2 = EE.equivalences({ co2: 20, water: 200 });
    expect(eq2.carMeters).toBeCloseTo(eq1.carMeters * 2, 1);
    expect(eq2.waterDrops).toBeCloseTo(eq1.waterDrops * 2, 0);
  });
});
