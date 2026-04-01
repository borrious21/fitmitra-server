// src/utils/validation.util.js

export function isValidDateString(dateString) {
  if (typeof dateString !== 'string') return false;
  
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  const timestamp = date.getTime();
  
  if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
    return false;
  }

  return dateString === date.toISOString().split('T')[0];
}

export function validateDate(dateString, options = {}) {
  const {
    allowFuture = true,
    allowPast = true,
    maxDaysInPast = null,
    maxDaysInFuture = null,
  } = options;

  const errors = [];

  if (!isValidDateString(dateString)) {
    errors.push('Invalid date format. Use YYYY-MM-DD');
    return { isValid: false, errors };
  }

  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!allowFuture && date > today) {
    errors.push('Future dates are not allowed');
  }

  if (!allowPast && date < today) {
    errors.push('Past dates are not allowed');
  }

  if (maxDaysInPast !== null) {
    const oldestAllowed = new Date();
    oldestAllowed.setDate(oldestAllowed.getDate() - maxDaysInPast);
    oldestAllowed.setHours(0, 0, 0, 0);
    
    if (date < oldestAllowed) {
      errors.push(`Date cannot be more than ${maxDaysInPast} days in the past`);
    }
  }

  if (maxDaysInFuture !== null) {
    const latestAllowed = new Date();
    latestAllowed.setDate(latestAllowed.getDate() + maxDaysInFuture);
    latestAllowed.setHours(0, 0, 0, 0);
    
    if (date > latestAllowed) {
      errors.push(`Date cannot be more than ${maxDaysInFuture} days in the future`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}