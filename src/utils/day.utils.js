// src/utils/day.utils.js
export const getTodayKey = (input) => {
  const date = input instanceof Date ? input : new Date(input);

  if (isNaN(date.getTime())) {
    throw new Error("Invalid date passed to getTodayKey");
  }

  const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return DAYS[date.getDay()];
};