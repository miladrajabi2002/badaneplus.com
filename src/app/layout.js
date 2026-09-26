import './globals.css';
import { buildSiteData, localBusinessSchema } from '@/lib/data';
import Interactions from '@/components/Interactions';
import {
  IconPhone, IconClose, IconHome, IconProducts, IconBlog, IconPin,
} from '@/components/icons';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FFFFFF',
};

const SITE_KEYWORDS = [
  'لوازم بدنه خودرو',
  'لوازم بدنه خودروهای ایرانی',
  'لوازم بدنه ۲۰۶',
  'لوازم بدنه سمند',
  'لوازم بدنه پراید',
  'لوازم بدنه ۴۰۵',
  'کاپوت ۲۰۶',
  'سپر پراید',
  'گلگیر ۴۰۵',
  'سینی فن ۲۰۶',
  'رنگ کوره‌ای',
  'رنگ کوره‌ای چیست',
  'قطعات فابریک',
  'قطعه فابریک چیست',
  'فروش لوازم بدنه تهران',
  'لوازم بدنه امیرکبیر',
];

export function generateMetadata() {
  const { settings } = buildSiteData();
  const site = settings.site || {};
  const c = settings.contact || {};
  const geoPos = `${c.geo_lat || '35.6892'};${c.geo_lng || '51.3890'}`;
  return {
    metadataBase: new URL(site.url || 'https://badaneplus.com'),
    title: {
      default: 'بدنه پلاس | مرجع لوازم بدنه خودروهای ایرانی — رنگ کوره‌ای + ۵ سال ضمانت رنگ',
      template: '%s | بدنه پلاس',
    },
    description: site.description,
    keywords: SITE_KEYWORDS,
    applicationName: 'بدنه پلاس',
    openGraph: {
      type: 'website',
      siteName: 'بدنه پلاس',
      locale: 'fa_IR',
      title: 'بدنه پلاس | مرجع لوازم بدنه خودروهای ایرانی',
      description: site.description,
      images: [{ url: '/assets/img/og-image.webp', width: 1200, height: 630, alt: 'بدنه پلاس — لوازم بدنه خودروهای ایرانی با رنگ کوره‌ای' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'بدنه پلاس | مرجع لوازم بدنه خودروهای ایرانی',
      description: site.description,
      images: ['/assets/img/og-image.webp'],
    },
    icons: {
      icon: [
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/favicon-48.png', sizes: '48x48', type: 'image/png' },
      ],
      apple: '/apple-touch-icon.png',
    },
    manifest: '/manifest.webmanifest',
    formatDetection: { telephone: 'yes' },
    other: {
      'geo.region': c.geo_region || 'IR-07',
      'geo.placename': c.city || 'تهران',
      'geo.position': geoPos,
      'ICBM': `${c.geo_lat || '35.6892'}, ${c.geo_lng || '51.3890'}`,
      'geo.country': 'IR',
    },
  };
}

export default function RootLayout({ children }) {
  const { settings, cars } = buildSiteData();
  const c = settings.contact || {};
  const lb = JSON.stringify(localBusinessSchema(settings));
  const carsWithProducts = cars.filter((car) => (car._products || []).length > 0);

  return (
    <html lang="fa" dir="rtl">
      <body>
        <link rel="preload" href="/assets/fonts/Estedad-FD-Black.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/assets/fonts/Vazirmatn-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: lb }} />

        <a className="skip-link" href="#main">رفتن به محتوای اصلی</a>

        {/* نوار پیشرفت اسکرول */}
        <div className="progress" aria-hidden="true"><i id="progressBar"></i></div>

        {/* هدر */}
        <header className="header" id="header">
          <div className="container header-inner">
            <a href="/" className="brand" aria-label="بدنه پلاس — صفحه اصلی">
              <img src="/assets/img/logo.svg" alt="لوگوی بدنه پلاس" width="44" height="44" className="brand-mark" />
              <span className="brand-text">
                <strong>بدنه‌پلاس</strong>
                <small>لوازم بدنه خودروهای ایرانی</small>
              </span>
            </a>
            <nav className="nav" aria-label="منوی اصلی">
              <a href="/#products" className="nav-link">محصولات</a>
              <a href="/#advantages" className="nav-link">چرا بدنه پلاس؟</a>
              <a href="/#kiln" className="nav-link">رنگ کوره‌ای</a>
              <a href="/blog/" className="nav-link">وبلاگ</a>
              <a href="/#contact" className="nav-link">تماس و آدرس</a>
            </nav>
            <div className="header-actions">
              <a href={`tel:${c.phone}`} className="btn btn-primary btn-sm header-call">
                <IconPhone />
                <span>{c.phone_display}</span>
              </a>
              <button className="menu-toggle" id="menuToggle" aria-label="باز کردن منو" aria-expanded="false" aria-controls="mobileMenu" type="button">
                <i></i><i></i>
              </button>
            </div>
          </div>
        </header>

        {/* منوی تمام‌صفحه موبایل */}
        <div className="mobile-menu" id="mobileMenu" aria-hidden="true">
          <nav className="mobile-menu-nav" aria-label="منوی موبایل">
            <a href="/#products" className="mm-link"><b>محصولات</b><span>کاپوت، سپر، گلگیر و…</span></a>
            <a href="/#advantages" className="mm-link"><b>چرا بدنه پلاس؟</b><span>ضمانت رنگ و ارسال سراسری</span></a>
            <a href="/#kiln" className="mm-link"><b>رنگ کوره‌ای</b><span>تفاوت با رنگ معمولی</span></a>
            <a href="/blog/" className="mm-link"><b>وبلاگ</b><span>راهنمای خرید و دانش خودرو</span></a>
            <a href="/#contact" className="mm-link"><b>تماس و آدرس</b><span>مسیر و شماره تماس</span></a>
          </nav>
          <div className="mobile-menu-cta">
            <a href={`tel:${c.phone}`} className="btn btn-primary btn-lg">
              <IconPhone />
              تماس: {c.phone_display}
            </a>
            <button className="btn btn-ghost btn-lg mobile-menu-close" id="mobileMenuClose" type="button">
              <IconClose />
              بستن منو
            </button>
          </div>
        </div>

        <main id="main">{children}</main>

        {/* فوتر */}
        <footer className="footer">
          <div className="container">
            <div className="footer-grid">
              <div className="footer-col footer-brand">
                <a href="/" className="brand">
                  <img src="/assets/img/logo.svg" alt="لوگوی بدنه پلاس" width="40" height="40" className="brand-mark" />
                  <span className="brand-text"><strong>بدنه‌پلاس</strong><small>لوازم بدنه خودروهای ایرانی</small></span>
                </a>
                <p>لوازم بدنه خودروهای ایرانی با رنگ کوره‌ای شرکتی و ۵ سال ضمانت رنگ.</p>
                <a href={`tel:${c.phone}`} className="footer-tel">
                  <IconPhone />
                  {c.phone_display}
                </a>
              </div>
              <div className="footer-col">
                <h4>دسترسی سریع</h4>
                <a href="/#products">محصولات</a>
                <a href="/#kiln">رنگ کوره‌ای</a>
                <a href="/blog/">وبلاگ</a>
                <a href="/#faq">سوالات متداول</a>
                <a href="/#contact">تماس و آدرس</a>
              </div>
              <div className="footer-col">
                <h4>لوازم بدنه خودروها</h4>
                {carsWithProducts.map((car) => (
                  <a key={car.id} href={`/${car.slug}/`}>لوازم بدنه {car.name_short}</a>
                ))}
              </div>
            </div>
            <div className="footer-bottom">
              <p>© ۱۴۰۴ بدنه پلاس — تمام حقوق محفوظ است.</p>
              <p className="footer-en">سامانه عرضه لوازم بدنه خودروهای ایرانی</p>
            </div>
          </div>
        </footer>

        {/* داک پایین موبایل */}
        <nav className="bottom-nav" aria-label="ناوبری موبایل">
          <div className="bn-dock">
            <a href="/" className="bn-item active" data-bn="home">
              <IconHome />
              <span>خانه</span>
            </a>
            <a href="/#products" className="bn-item" data-bn="products">
              <IconProducts />
              <span>محصولات</span>
            </a>
            <a href={`tel:${c.phone}`} className="bn-call" data-bn="call" aria-label="تماس با بدنه پلاس">
              <IconPhone />
              <span>تماس</span>
            </a>
            <a href="/blog/" className="bn-item" data-bn="blog">
              <IconBlog />
              <span>وبلاگ</span>
            </a>
            <a href="/#contact" className="bn-item" data-bn="contact">
              <IconPin />
              <span>آدرس</span>
            </a>
          </div>
        </nav>

        {/* شیت نمایش سریع محصول */}
        <div className="sheet-backdrop" id="sheetBackdrop" aria-hidden="true"></div>
        <div className="sheet" id="productSheet" role="dialog" aria-modal="true" aria-label="جزئیات محصول" aria-hidden="true">
          <button className="sheet-close" id="sheetClose" aria-label="بستن" type="button">
            <IconClose />
          </button>
          <div className="sheet-body" id="sheetBody"></div>
        </div>

        <Interactions />
      </body>
    </html>
  );
}
