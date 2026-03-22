window.TimeUtils = {
  nowISO() { return new Date().toISOString(); },
  hourKey() { return new Date().getHours(); },
  dayKey() { return new Date().toISOString().slice(0, 10); }
};
