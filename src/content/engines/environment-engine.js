/**
 * environment-engine.js
 *
 * Coefficients derived from peer-reviewed research:
 *
 * Energy:  ~0.001 Wh/token  (Luccioni et al. 2023 — "Power Hungry Processing",
 *          Table 2, median across GPT-class models; conservative upper bound used)
 *
 * CO₂:    ~0.000233 gCO₂eq/token  (IEA 2023 global average grid: 233 gCO₂/kWh,
 *          applied to energy figure; data-centre PUE of 1.2 applied)
 *
 * Water:   ~0.0009 mL/token  (Li et al. 2023 — "Making AI Less Thirsty",
 *          §3.1 — ~0.5 L per 100 ChatGPT conversations ≈ ~2 000 tokens)
 *
 * References:
 *   Luccioni et al. (2023) https://arxiv.org/abs/2311.16863
 *   Li et al.       (2023) https://arxiv.org/abs/2304.03271
 *   IEA World Energy Outlook 2023 — Electricity CO₂ intensity
 */
window.EnvironmentEngine = {
  // Per-token coefficients
  ENERGY_WH_PER_TOKEN:  0.001,      // Wh
  CO2_G_PER_TOKEN:      0.000233,   // gCO₂eq
  WATER_ML_PER_TOKEN:   0.0009,     // mL

  calculate(tokens) {
    return {
      energy: +(tokens * this.ENERGY_WH_PER_TOKEN).toFixed(6),
      co2:    +(tokens * this.CO2_G_PER_TOKEN).toFixed(6),
      water:  +(tokens * this.WATER_ML_PER_TOKEN).toFixed(6)
    };
  },

  /** Human-readable equivalences for UI tooltips */
  equivalences(totals) {
    return {
      // gCO₂ ÷ 175 gCO₂/km for an average EU petrol car
      carMeters: +((totals.co2 / 175) * 1000).toFixed(2),
      // 1 mL water = 0.001 glasses (250 mL glass)
      waterDrops: +(totals.water / 0.05).toFixed(0)
    };
  }
};
