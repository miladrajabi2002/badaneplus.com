/** @type {import('next').NextConfig} */
const nextConfig = {
  // خروجی کاملاً استاتیک — nginx مستقیم فایل‌های HTML را سرو می‌کند
  output: 'export',
  // حفظ ساختار URL نسخه قبلی: /samand/ ، /blog/slug/
  trailingSlash: true,
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
