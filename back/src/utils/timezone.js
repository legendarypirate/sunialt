const APP_TIME_ZONE = process.env.APP_TIME_ZONE || 'Asia/Ulaanbaatar';

function localTimeParts(date = new Date(), timeZone = APP_TIME_ZONE) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  return {
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function isExactLocalTime(hour, minute = 0, date = new Date(), timeZone = APP_TIME_ZONE) {
  const parts = localTimeParts(date, timeZone);
  return parts.hour === hour && parts.minute === minute;
}

module.exports = {
  APP_TIME_ZONE,
  localTimeParts,
  isExactLocalTime,
};
