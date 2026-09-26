// ابزارهای مشترک: اعداد فارسی، قیمت، تاریخ شمسی
// هم در سایت (build-time) و هم در سرور Node و ربات استفاده می‌شود
import { toJalaali } from 'jalaali-js';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const EN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function faNum(value) {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[+d]);
}

export function enNum(value) {
  return String(value).replace(/[۰-۹]/g, (d) => String(EN_DIGITS.indexOf(d)));
}

export function priceFmt(value) {
  if (!value) return '';
  const s = Math.round(Number(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    .replace(/,/g, '،');
  return faNum(s);
}

export const JMONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

/** «2025-09-20» → «۲۰ شهریور ۱۴۰۴» */
export function jdate(isoStr) {
  try {
    const m = String(isoStr).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return faNum(String(isoStr).slice(0, 10));
    const j = toJalaali(+m[1], +m[2], +m[3]);
    return `${faNum(j.jd)} ${JMONTHS[j.jm - 1]} ${faNum(j.jy)}`;
  } catch {
    return faNum(String(isoStr).slice(0, 10));
  }
}

/** کلید ماه شمسی «jYYY-MM» از تاریخ میلادی */
export function jmonthKeyOf(gy, gm, gd) {
  const j = toJalaali(gy, gm, gd);
  return `${String(j.jy).padStart(4, '0')}-${String(j.jm).padStart(2, '0')}`;
}
