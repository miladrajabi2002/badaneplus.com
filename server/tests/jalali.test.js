// تست تاریخ شمسی و فرمت اعداد فارسی
const test = require('node:test');
const assert = require('node:assert');

const { jdate, faNum, priceFmt, jmonthKeyOf } = require('../../src/lib/format.js');
const { tehranDayKey, jmonthKey } = require('../tz');

test('faNum: تبدیل ارقام به فارسی', () => {
  assert.equal(faNum(123), '۱۲۳');
  assert.equal(faNum('2025'), '۲۰۲۵');
  assert.equal(faNum(0), '۰');
});

test('priceFmt: جداکننده هزارگان فارسی', () => {
  assert.equal(priceFmt(14800000), '۱۴،۸۰۰،۰۰۰');
  assert.equal(priceFmt(4900000), '۴،۹۰۰،۰۰۰');
  assert.equal(priceFmt(0), '');
  assert.equal(priceFmt(999), '۹۹۹');
});

test('jdate: تبدیل میلادی به شمسی (نقاط مرزی معتبر)', () => {
  assert.equal(jdate('2025-03-21'), '۱ فروردین ۱۴۰۴'); // نوروز ۱۴۰۴
  assert.equal(jdate('2025-09-23'), '۱ مهر ۱۴۰۴');      // اول مهر
  assert.equal(jdate('2025-09-26'), '۴ مهر ۱۴۰۴');
  assert.equal(jdate('2026-03-20'), '۲۹ اسفند ۱۴۰۴');   // آخرین روز ۱۴۰۴
  assert.equal(jdate('2026-03-21'), '۱ فروردین ۱۴۰۵');  // نوروز ۱۴۰۵
  assert.equal(jdate('2026-09-26'), '۴ مهر ۱۴۰۵');      // امروز
});

test('jmonthKeyOf: کلید ماه شمسی', () => {
  assert.equal(jmonthKeyOf(2025, 9, 26), '1404-07');
  assert.equal(jmonthKeyOf(2025, 3, 21), '1404-01');
  assert.equal(jmonthKeyOf(2026, 3, 20), '1404-12');
});

test('tehranDayKey: مرز نیمه‌شب تهران (UTC+3:30)', () => {
  // ۲۰:۰۰ UTC = ۲۳:۳۰ تهران همان روز
  assert.equal(tehranDayKey(new Date('2026-09-22T20:00:00Z')), '2026-09-22');
  // ۲۰:۳۰ UTC = ۰۰:۰۰ روز بعد تهران
  assert.equal(tehranDayKey(new Date('2026-09-22T20:30:00Z')), '2026-09-23');
});

test('jmonthKey: مرز ماه شمسی (شهریور/مهر ۱۴۰۵)', () => {
  // ۲۰۲۶-۰۹-۲۲ = ۳۱ شهریور ۱۴۰۵
  assert.equal(jmonthKey(new Date('2026-09-22T10:00:00Z')), '1405-06');
  // ۲۰۲۶-۰۹-۲۳ = ۱ مهر ۱۴۰۵
  assert.equal(jmonthKey(new Date('2026-09-23T10:00:00Z')), '1405-07');
});
