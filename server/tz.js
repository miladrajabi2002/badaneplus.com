// ابزار منطقه زمانی تهران و کلید ماه شمسی — بدون وابستگی به دیتابیس
const { toJalaali } = require('jalaali-js');

const tehranFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit',
});

/** کلید روز تهران «YYYY-MM-DD» */
function tehranDayKey(date = new Date()) {
  return tehranFmt.format(date);
}

/** کلید ماه شمسی «jYYY-MM» */
function jmonthKey(date = new Date()) {
  const [y, m, d] = tehranDayKey(date).split('-').map(Number);
  const j = toJalaali(y, m, d);
  return `${String(j.jy).padStart(4, '0')}-${String(j.jm).padStart(2, '0')}`;
}

module.exports = { tehranDayKey, jmonthKey };
