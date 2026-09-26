import { buildSiteData, makeLinkifier, faqSchema, productsListSchema, breadcrumbSchema } from '@/lib/data';
import ProductCard from '@/components/ProductCard';
import { IconPhone, IconPin } from '@/components/icons';

export const dynamicParams = false;

export function generateStaticParams() {
  const { cars } = buildSiteData();
  // فقط خودروهایی که محصول دارند صفحه سئو می‌گیرند (مطابق نسخه قبلی)
  return cars
    .filter((car) => (car._products || []).length > 0)
    .map((car) => ({ car: car.slug }));
}

export function generateMetadata({ params }) {
  const { cars } = buildSiteData();
  const car = cars.find((c) => c.slug === params.car);
  if (!car) return {};
  const base = 'https://badaneplus.com';
  return {
    title: car.seo_title,
    description: car.meta_description,
    keywords: [
      `لوازم بدنه ${car.name}`,
      `خرید ${car.name}`,
      ...(car.variants || []).map((v) => `لوازم بدنه ${v}`),
      'رنگ کوره‌ای',
      'قطعه فابریک',
    ],
    alternates: { canonical: `${base}/${car.slug}/` },
    openGraph: {
      title: `${car.seo_title} | بدنه پلاس`,
      description: car.meta_description,
    },
  };
}

export default function CarPage({ params }) {
  const { settings, cars } = buildSiteData();
  const car = cars.find((c) => c.slug === params.car);
  if (!car) return null;

  const c = settings.contact || {};
  const base = (settings.site || {}).url || 'https://badaneplus.com';
  const carProducts = car._products || [];
  const linkify = makeLinkifier(cars);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(car.faq)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productsListSchema(carProducts, base, `${base}/${car.slug}/`)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([
        { name: 'خانه', url: `${base}/` },
        { name: car.name, url: `${base}/${car.slug}/` },
      ])) }} />

      <section className="hero car-hero">
        <div className="hero-bg" aria-hidden="true">
          <div className="hero-grid"></div>
          <div className="hero-glow"></div>
        </div>
        <div className="container">
          <nav className="breadcrumb" aria-label="مسیر">
            <a href="/">خانه</a><span>›</span><b>{car.name}</b>
          </nav>
          <div className="hero-copy">
            <div className="hero-badge" data-reveal><span className="pulse-dot"></span>لوازم بدنه {car.name}</div>
            <h1 className="hero-title">
              <span className="line" data-reveal data-delay="1">لوازم بدنه</span>
              <span className="line grad-text" data-reveal data-delay="2">{car.name}</span>
            </h1>
            <p className="hero-sub" data-reveal data-delay="3">{car.intro}</p>
            <div className="hero-cta" data-reveal data-delay="4">
              <a href="#car-products" className="btn btn-primary btn-lg">قطعات موجود {car.name_short}</a>
              <a href={`tel:${c.phone}`} className="btn btn-ghost btn-lg">تماس و استعلام قیمت</a>
            </div>
            {(car.variants || []).length > 0 ? (
              <div className="car-variants" data-reveal data-delay="5">
                {car.variants.map((v) => <span className="variant-chip" key={v}>{v}</span>)}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section section-light products-section" id="car-products">
        <div className="container">
          <div className="section-head" data-reveal>
            <span className="eyebrow">قطعات موجود</span>
            <h2 className="section-title">{car.parts_intro || `قطعات موجود ${car.name}`}</h2>
            <p className="section-sub">قیمت‌ها با نوسان بازار تغییر می‌کنند؛ برای قیمت روز و موجودی دقیق، تماس بگیرید.</p>
          </div>
          <div className="products-grid">
            {carProducts.map((p, i) => (
              <ProductCard key={p.id} p={p} phone={c.phone} showCar={false} delay={(i % 4) + 1} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section-light">
        <div className="container prose">
          {(car.body || []).map((sec, i) => (
            <div className="prose-block" data-reveal key={i}>
              <h2>{sec.h2}</h2>
              <p dangerouslySetInnerHTML={{ __html: linkify(sec.text) }} />
            </div>
          ))}
        </div>
      </section>

      <section className="section section-light faq-section">
        <div className="container faq-container">
          <div className="section-head" data-reveal>
            <span className="eyebrow">سوالات متداول</span>
            <h2 className="section-title">سوالات متداول <em className="grad-text-dark">{car.name_short}</em></h2>
          </div>
          <div className="faq-list" data-reveal>
            {(car.faq || []).map((f, i) => (
              <details className="faq-item" open={i === 0} key={f.q}>
                <summary><span>{f.q}</span><i className="faq-plus" aria-hidden="true"></i></summary>
                <div className="faq-body"><p>{f.a}</p></div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-dark contact-section">
        <div className="container">
          <div className="section-head" data-reveal>
            <span className="eyebrow eyebrow-dark">تماس</span>
            <h2 className="section-title">برای استعلام قطعات <em className="grad-text">{car.name_short}</em> تماس بگیرید</h2>
          </div>
          <div className="contact-grid">
            <a href={`tel:${c.phone}`} className="c-card c-card-phone" data-reveal>
              <div className="c-icon"><IconPhone className="ico" /></div>
              <div><span className="c-label">تماس ثابت</span><b className="c-value c-rtl-num" dir="ltr">{c.phone_display}</b><span className="c-hint">{c.hours}</span></div>
            </a>
            <div className="c-card c-card-address" data-reveal data-delay="1">
              <div className="c-icon"><IconPin className="ico" /></div>
              <div><span className="c-label">آدرس</span><b className="c-value">{c.address}</b></div>
            </div>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="container">
          <h2 className="final-title" data-reveal>سفارش قطعات {car.name} فقط با یک تماس</h2>
          <p data-reveal data-delay="1">رنگ کوره‌ای شرکتی · قطعات فابریک · ۵ سال ضمانت رنگ · ارسال سراسری</p>
          <a href={`tel:${c.phone}`} className="btn btn-primary btn-xl" data-reveal data-delay="2">تماس: {c.phone_display}</a>
        </div>
      </section>
    </>
  );
}
