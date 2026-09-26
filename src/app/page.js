import { buildSiteData, makeLinkifier, faqSchema, productsListSchema, visiblePosts } from '@/lib/data';
import { faNum } from '@/lib/format';
import ProductCard from '@/components/ProductCard';
import {
  IconPhone, IconArrow, IconFlame, IconChart, IconShield, IconTruck,
  IconChipShield, IconChipChart, IconStep2, IconMobile, IconPin,
} from '@/components/icons';

export const dynamicParams = false;

const FAQ_MAIN = [
  {
    q: 'لوازم بدنه پلاس برای چه خودروهایی قطعه دارد؟',
    a: 'تمرکز ما روی خودروهای ایرانی است: پژو ۲۰۶، سمند و سورن، پژو ۴۰۵ و پارس، پراید و تیبا. برای خودروهایی مثل دنا، رانا و شاهین هم با تماس قبلی قطعه تأمین می‌کنیم.',
  },
  {
    q: 'چرا سفارش فقط تلفنی است؟',
    a: 'قیمت قطعات بدنه با نوسان بازار تغییر می‌کند و موجودی روزانه به‌روز می‌شود. با یک تماس، قیمت روز، موجودی دقیق و مشاوره فنی رایگان را همان‌جا می‌شنوید.',
  },
  {
    q: 'رنگ کوره‌ای شرکتی چه تفاوتی با رنگ معمولی دارد؟',
    a: 'رنگ کوره‌ای در دمای کنترل‌شده و کوره پخت می‌شود؛ چسبندگی آن به فلز چند برابر رنگ اسپری معمولی است و در برابر آفتاب، شست‌وشو و رطوبت سال‌ها بدون برفک و ترک باقی می‌ماند. به همین دلیل می‌توانیم ۵ سال ضمانت رنگ بدهیم.',
  },
  {
    q: 'ضمانت ۵ ساله رنگ دقیقا شامل چه چیزی می‌شود؟',
    a: 'ضمانت ۵ ساله شامل برفک‌زدگی، تغییر رنگ، ترک خوردن و جوش‌زدگی سطح رنگ است و روی فاکتور خرید درج می‌شود.',
  },
  {
    q: 'آیا ارسال به شهرستان دارید؟',
    a: 'بله؛ تمام قطعات با بسته‌بندی حرفه‌ای و پوشش محافظ به همه استان‌های کشور ارسال می‌شوند. کاپوت، سپر و گلگیر با بسته‌بندی مخصوص ارسال می‌شوند تا سالم به دست شما برسند.',
  },
  {
    q: 'قطعه فابریک و رنگ کوره‌ای چه تفاوتی دارند؟',
    a: 'قطعه فابریک با پرس و قالب اصلی کارخانه تولید می‌شود و معمولا با رنگ اولیه عرضه می‌شود. گزینه رنگ کوره‌ای یعنی قطعه باکیفیت که با رنگ شرکتی و پخت کوره‌ای آماده نصب روی خودروی شما شده است. هر دو گزینه در بدنه پلاس با ۵ سال ضمانت رنگ عرضه می‌شوند.',
  },
];

const MARQUEE_BRANDS = ['پژو ۲۰۶', 'سمند', 'سورن', 'پژو ۴۰۵', 'پارس', 'پراید', 'تیبا', 'دنا', 'رانا', 'شاهین'];

export function generateMetadata() {
  const { settings } = buildSiteData();
  const base = (settings.site || {}).url || 'https://badaneplus.com';
  return {
    description: (settings.site || {}).description,
    alternates: { canonical: `${base}/` },
  };
}

export default function HomePage() {
  const { settings, cars, categories, products, posts } = buildSiteData();
  const s = settings;
  const c = s.contact || {};
  const hero = s.hero || {};
  const base = (s.site || {}).url || 'https://badaneplus.com';
  const visibleProducts = products.filter((p) => p.visible !== false);
  const shownPosts = visiblePosts(posts).slice(0, 3);
  const usedCats = [...new Set(visibleProducts.map((p) => p.category))];
  const carsWithProducts = cars.filter((car) => (car._products || []).length > 0);

  return (
    <>
      <link rel="preload" href="/assets/img/site/hero-card.webp" as="image" fetchPriority="high" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(FAQ_MAIN)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productsListSchema(visibleProducts, base, `${base}/`)) }} />

      {/* ================= هیرو (دقیقا یک صفحه — بدون نیاز به اسکرول) ================= */}
      <section className="hero" id="home">
        <div className="hero-bg" aria-hidden="true">
          <div className="hero-grid"></div>
          <div className="hero-glow"></div>
        </div>
        <div className="container hero-inner">
          <div className="hero-copy">
            <div className="hero-badge" data-reveal>
              <span className="pulse-dot" aria-hidden="true"></span>
              {hero.badge}
            </div>
            <h1 className="hero-title">
              <span className="line" data-reveal data-delay="1">{hero.title_1}</span>
              <span className="line grad-text" data-reveal data-delay="2">{hero.title_2}</span>
            </h1>
            <p className="hero-sub" data-reveal data-delay="3">
              <span className="only-desktop">{hero.subtitle}</span>
              <span className="only-mobile">{hero.subtitle_short}</span>
            </p>
            <div className="hero-cta" data-reveal data-delay="4">
              <a href="#products" className="btn btn-primary btn-lg">
                {hero.cta_primary}
                <IconArrow />
              </a>
              <a href={`tel:${c.phone}`} className="btn btn-ghost btn-lg">
                <IconPhone />
                {hero.cta_secondary}
              </a>
            </div>
            <div className="hero-trust" data-reveal data-delay="5">
              <div className="trust-item"><b>رنگ کوره‌ای</b><span>شرکتی</span></div>
              <div className="trust-sep" aria-hidden="true"></div>
              <div className="trust-item"><b>قطعات فابریک</b><span>اصل کارخانه</span></div>
              <div className="trust-sep" aria-hidden="true"></div>
              <div className="trust-item"><b>ارسال</b><span>سراسر کشور</span></div>
            </div>
          </div>
          <div className="hero-visual" data-reveal data-delay="3">
            <div className="hero-frame">
              <img src="/assets/img/site/hero-card.webp" alt="کاپوت فابریک با رنگ کوره‌ای — بدنه پلاس" width="1152" height="864" fetchPriority="high" decoding="async" />
              <div className="hero-chip chip-1">
                <IconChipShield />
                <div><b>ضمانت رنگ</b><span>۵ سال کامل</span></div>
              </div>
              <div className="hero-chip chip-2">
                <IconChipChart />
                <div><b>پخت کوره‌ای</b><span>درجه یک</span></div>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-stats container" data-reveal>
          {(s.stats || []).map((st) => (
            <div className="stat" key={st.label}>
              <b className="stat-num"><span className="counter" data-count={st.value}>۰</span>{st.suffix}</b>
              <span className="stat-label">{st.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ================= نوار متحرک برندها ================= */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map((g) => (
            <div className="marquee-group" key={g}>
              {MARQUEE_BRANDS.map((b) => (
                <span key={b} style={{ display: 'contents' }}>
                  <span className="marquee-item">{b}</span>
                  <span className="marquee-star">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ================= مزیت‌ها ================= */}
      <section className="section section-dark usp-section" id="advantages">
        <div className="container">
          <div className="section-head" data-reveal>
            <span className="eyebrow">چرا بدنه پلاس؟</span>
            <h2 className="section-title">چهار دلیل برای <em className="grad-text">خرید از بدنه پلاس</em></h2>
            <p className="section-sub">در بازار لوازم بدنه، کیفیت قطعه و کیفیت رنگ است که خرید را موفق یا پشیمان‌کننده می‌کند. هر دو را همین‌جا تضمین می‌کنیم.</p>
          </div>
          <div className="usp-grid">
            <article className="usp-card usp-kiln" data-reveal data-delay="1">
              <div className="usp-icon"><IconFlame /></div>
              <h3>رنگ کوره‌ای شرکتی</h3>
              <p>
                <span className="only-desktop">رنگ قطعات در کوره و دمای کنترل‌شده پخت می‌شود؛ همان فرآیند کارخانه‌ای. چسبندگی چند برابر، برفک‌زدگی صفر و درخشش ماندگار در برابر آفتاب ایران.</span>
                <span className="only-mobile">همان فرآیند رنگ کارخانه؛ چسبندگی چند برابر و برفک‌زدگی صفر.</span>
              </p>
              <span className="usp-tag">پخت کامل · بدون پرزدگی</span>
            </article>
            <article className="usp-card" data-reveal data-delay="2">
              <div className="usp-icon"><IconChart /></div>
              <h3>قطعات فابریک</h3>
              <p>
                <span className="only-desktop">قطعه اصل کارخانه با پرس دقیق، ضخامت فلز استاندارد و نقاط نصب هم‌اندازه؛ نصب بدون صافکاری و درزگیری مثل روز اول.</span>
                <span className="only-mobile">پرس دقیق کارخانه؛ نصب بدون صافکاری و درزگیری.</span>
              </p>
              <span className="usp-tag">پرس کارخانه · ابعاد دقیق</span>
            </article>
            <article className="usp-card usp-warranty" data-reveal data-delay="3">
              <div className="usp-icon"><IconShield /></div>
              <h3>۵ سال ضمانت رنگ</h3>
              <p>
                <span className="only-desktop">به کیفیت رنگمان آن‌قدر مطمئنیم که روی <strong>تمام اجناس</strong> ۵ سال ضمانت می‌دهیم؛ شامل برفک، تغییر رنگ و ترک سطح. مکتوب روی فاکتور.</span>
                <span className="only-mobile">روی <strong>تمام اجناس</strong>؛ شامل برفک و تغییر رنگ — مکتوب روی فاکتور.</span>
              </p>
              <span className="usp-tag">مکتوب روی فاکتور</span>
            </article>
            <article className="usp-card" data-reveal data-delay="4">
              <div className="usp-icon"><IconTruck /></div>
              <h3>ارسال به سراسر کشور</h3>
              <p>
                <span className="only-desktop">از تهران تا دورترین نقاط ایران؛ بسته‌بندی حرفه‌ای مخصوص قطعات بدنه (کاپوت، سپر، گلگیر) تا سالم و بی‌خش به دستتان برسد.</span>
                <span className="only-mobile">بسته‌بندی حرفه‌ای مخصوص قطعات بدنه؛ سالم به سراسر کشور.</span>
              </p>
              <span className="usp-tag">بسته‌بندی حرفه‌ای · بیمه مسیر</span>
            </article>
          </div>
        </div>
      </section>

      {/* ================= محصولات ================= */}
      <section className="section section-light products-section" id="products">
        <div className="container">
          <div className="section-head" data-reveal>
            <span className="eyebrow">ویترین محصولات</span>
            <h2 className="section-title">قطعه‌ی مورد نظر را <em className="grad-text-dark">پیدا کنید</em></h2>
            <p className="section-sub">
              <span className="only-desktop">هر قطعه با دو گزینه کیفیت عرضه می‌شود: فابریک یا رنگ کوره‌ای شرکتی — هر دو با ۵ سال ضمانت رنگ. برای استعلام قیمت روز، تماس بگیرید.</span>
              <span className="only-mobile">فابریک یا رنگ کوره‌ای — هر دو با ۵ سال ضمانت رنگ.</span>
            </p>
          </div>

          <div className="filters" data-reveal>
            <div className="filter-row filter-cars" role="tablist" aria-label="فیلتر خودرو">
              <button className="fchip is-active" data-car="all" role="tab" aria-selected="true" type="button">همه خودروها</button>
              {carsWithProducts.map((car) => (
                <button className="fchip" data-car={car.id} role="tab" aria-selected="false" key={car.id} type="button">{car.name}</button>
              ))}
            </div>
            <div className="filter-row filter-cats" role="tablist" aria-label="فیلتر دسته‌بندی">
              <button className="fchip fchip-cat is-active" data-cat="all" role="tab" aria-selected="true" type="button">همه قطعات</button>
              {categories.filter((cat) => usedCats.includes(cat.id)).map((cat) => (
                <button className="fchip fchip-cat" data-cat={cat.id} role="tab" aria-selected="false" key={cat.id} type="button">{cat.name}</button>
              ))}
            </div>
          </div>

          <div className="products-grid" id="productsGrid">
            {visibleProducts.map((p, i) => (
              <ProductCard key={p.id} p={p} phone={c.phone} showCar delay={(i % 4) + 1} />
            ))}
          </div>
          <p className="products-note" data-reveal>چیزی که می‌خواهید را پیدا نکردید؟ لیست سایت بخشی از موجودی ماست — <a href={`tel:${c.phone}`}>تماس بگیرید</a>، احتمالا موجود است.</p>
        </div>
      </section>

      {/* ================= نوار ضمانت ================= */}
      <section className="section warranty-band" id="warranty">
        <div className="container warranty-inner">
          <div className="warranty-visual" data-reveal>
            <div className="warranty-big">
              <span className="counter grad-text" data-count="5">۰</span>
              <span className="warranty-years">سال</span>
            </div>
            <svg className="warranty-ring" viewBox="0 0 200 200" aria-hidden="true">
              <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(242,168,59,.12)" strokeWidth="2" />
              <circle cx="100" cy="100" r="76" fill="none" stroke="rgba(242,168,59,.2)" strokeWidth="1" strokeDasharray="4 8" />
              <circle className="warranty-arc" cx="100" cy="100" r="88" fill="none" stroke="url(#arcGrad)" strokeWidth="3" strokeLinecap="round" strokeDasharray="553" strokeDashoffset="553" />
              <defs>
                <linearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFC96B" /><stop offset="1" stopColor="#D9821F" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="warranty-copy" data-reveal data-delay="2">
            <span className="eyebrow eyebrow-dark">ضمانت نوشته‌شده روی فاکتور</span>
            <h2 className="section-title">۵ سال ضمانت رنگ روی <em className="grad-text">تمام اجناس</em></h2>
            <p>
              <span className="only-desktop">ضمانت رنگ بدنه پلاس شامل برفک‌زدگی، تغییر رنگ، ترک خوردن و جوش‌زدگی سطح رنگ است و مکتوب روی فاکتور خرید درج می‌شود. چون رنگ کوره‌ای شرکتی که روی قطعات اجرا می‌کنیم، همان فرآیند پخت کارخانه را دارد، می‌توانیم این تعهد را بدهیم؛ رنگ معمولی چنین ضمانتی را ممکن نمی‌کند.</span>
              <span className="only-mobile">شامل برفک‌زدگی، تغییر رنگ و ترک سطح — مکتوب روی فاکتور خرید. چون رنگ کوره‌ای همان پخت کارخانه را دارد، این تعهد ممکن است.</span>
            </p>
            <ul className="check-list">
              <li>شامل برفک، تغییر رنگ و ترک سطح</li>
              <li>مکتوب روی فاکتور خرید</li>
              <li>معتبر برای تمام قطعات بدنه</li>
            </ul>
            <a href={`tel:${c.phone}`} className="btn btn-primary btn-lg">استعلام با تماس</a>
          </div>
        </div>
      </section>

      {/* ================= رنگ کوره‌ای ================= */}
      <section className="section section-light kiln-section" id="kiln">
        <div className="container">
          <div className="section-head" data-reveal>
            <span className="eyebrow">رنگ کوره‌ای چیست؟</span>
            <h2 className="section-title">فرق رنگ کوره‌ای با رنگ معمولی، <em className="grad-text-dark">فرق کوره با فن</em> است</h2>
            <p className="section-sub">رنگ کوره‌ای در دمای کنترل‌شده و زمان مشخص در کوره پخت می‌شود؛ مولکول‌های رنگ کاملا به فلز جوش می‌خورند. نتیجه؟ رنگی که سال‌ها مثل روز اول می‌ماند.</p>
          </div>
          <div className="kiln-grid">
            <div className="kiln-compare" data-reveal>
              <div className="kcard kcard-kiln">
                <header>
                  <span className="k-badge">بدنه پلاس</span>
                  <h3>رنگ کوره‌ای شرکتی</h3>
                </header>
                <ul>
                  <li className="win">پخت کامل در کوره صنعتی</li>
                  <li className="win only-desktop">چسبندگی مولکولی به فلز</li>
                  <li className="win">مقاوم به آفتاب و رطوبت</li>
                  <li className="win">ضمانت ۵ ساله رنگ</li>
                </ul>
              </div>
              <div className="kcard kcard-normal">
                <header>
                  <span className="k-badge k-badge-gray">رایج بازار</span>
                  <h3>رنگ اسپری معمولی</h3>
                </header>
                <ul>
                  <li className="lose">خشک شدن هوا (بدون پخت)</li>
                  <li className="lose only-desktop">لایه رنگی روی سطح فلز</li>
                  <li className="lose only-desktop">حساس به آفتاب و شوینده</li>
                  <li className="lose">بدون ضمانت واقعی</li>
                </ul>
              </div>
            </div>
            <div className="kiln-visual" data-reveal data-delay="2">
              <img src="/assets/img/blog/b-kiln-card.webp" alt="رنگ‌کوری صنعتی بدنه پلاس — پخت رنگ کوره‌ای" width="880" height="503" loading="lazy" decoding="async" />
              <div className="kiln-note">
                <b>چرا مهم است؟</b>
                <span>
                  <span className="only-desktop">بیشتر شکایت‌های خرید قطعه بدنه، از بی‌کیفیتی رنگ است نه خود قطعه. با رنگ کوره‌ای، این ریسک صفر می‌شود.</span>
                  <span className="only-mobile">بیشتر شکایت‌ها از بی‌کیفیتی رنگ است، نه خود قطعه.</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= سفارش در ۳ قدم ================= */}
      <section className="section section-light steps-section" id="order">
        <div className="container">
          <div className="section-head" data-reveal>
            <span className="eyebrow">سفارش تلفنی، ساده و سریع</span>
            <h2 className="section-title">سفارش در <em className="grad-text-dark">۳ قدم</em></h2>
            <p className="section-sub">بدون ثبت‌نام و پیچیدگی — قطعه تا خانه‌تان می‌رسد.</p>
          </div>
          <div className="steps-grid">
            <div className="steps-line" aria-hidden="true"><i></i></div>
            <article className="step" data-reveal data-delay="1">
              <div className="step-badge">
                <span className="step-icon"><IconPhone /></span>
                <span className="step-num">۱</span>
              </div>
              <h3>تماس بگیرید</h3>
              <p>
                <span className="only-desktop">مدل خودرو و قطعه مورد نظرتان را بگویید؛ کارشناس ما مدل دقیق و گزینه‌های موجود را معرفی می‌کند.</span>
                <span className="only-mobile">مدل خودرو و قطعه‌ی مورد نظرتان را بگویید.</span>
              </p>
            </article>
            <article className="step" data-reveal data-delay="2">
              <div className="step-badge">
                <span className="step-icon"><IconStep2 /></span>
                <span className="step-num">۲</span>
              </div>
              <h3>استعلام و انتخاب</h3>
              <p>
                <span className="only-desktop">قیمت روز، موجودی واقعی و زمان آماده‌سازی را در همان تماس دریافت کنید و با خیال راحت انتخاب کنید.</span>
                <span className="only-mobile">قیمت روز و موجودی را در همان تماس بپرسید.</span>
              </p>
            </article>
            <article className="step" data-reveal data-delay="3">
              <div className="step-badge">
                <span className="step-icon"><IconTruck /></span>
                <span className="step-num">۳</span>
              </div>
              <h3>تحویل یا ارسال</h3>
              <p>
                <span className="only-desktop">تحویل حضوری در تهران یا ارسال بیمه‌شده با بسته‌بندی حرفه‌ای به همه نقاط کشور.</span>
                <span className="only-mobile">حضوری در تهران، یا ارسال بیمه‌شده به همه نقاط کشور.</span>
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ================= پیش‌نمایش وبلاگ ================= */}
      <section className="section section-light blog-section">
        <div className="container">
          <div className="section-head section-head-row" data-reveal>
            <div>
              <span className="eyebrow">وبلاگ بدنه پلاس</span>
              <h2 className="section-title">راهنمای خرید و <em className="grad-text-dark">دانش خودرو</em></h2>
            </div>
            <a href="/blog/" className="btn btn-ghost-dark btn-sm">همه مقالات</a>
          </div>
          <div className="blog-grid">
            {shownPosts.map((post, i) => {
              const imgDir = String(post.image || '').startsWith('b-') ? 'blog' : 'products';
              return (
                <a href={`/blog/${post.slug}/`} className="b-card" data-reveal data-delay={i + 1} key={post.slug}>
                  <div className="b-media">
                    <img src={`/assets/img/${imgDir}/${post.image}-card.webp`} alt={post.title} width="880" height="503" loading="lazy" decoding="async" />
                  </div>
                  <div className="b-info">
                    <div className="b-meta"><span className="b-cat">{post.category}</span><span>·</span><span>{faNum(post.read_time)} دقیقه مطالعه</span></div>
                    <h3 className="b-title">{post.title}</h3>
                    <p className="b-excerpt">{post.excerpt}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= سوالات متداول ================= */}
      <section className="section section-light faq-section" id="faq">
        <div className="container faq-container">
          <div className="section-head" data-reveal>
            <span className="eyebrow">سوالات متداول</span>
            <h2 className="section-title">هر چیزی که باید <em className="grad-text-dark">بدانید</em></h2>
          </div>
          <div className="faq-list" data-reveal>
            {FAQ_MAIN.map((f, i) => (
              <details className="faq-item" open={i === 0} key={f.q}>
                <summary>
                  <span>{f.q}</span>
                  <i className="faq-plus" aria-hidden="true"></i>
                </summary>
                <div className="faq-body"><p>{f.a}</p></div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ================= تماس و نقشه ================= */}
      <section className="section section-dark contact-section" id="contact">
        <div className="container">
          <div className="section-head" data-reveal>
            <span className="eyebrow eyebrow-dark">تماس و آدرس</span>
            <h2 className="section-title">تماس بگیرید یا <em className="grad-text">تشریف بیارید</em></h2>
            <p className="section-sub">برای استعلام قیمت و مشاوره تلفنی رایگان، همین حالا تماس بگیرید. برای خرید حضوری، مسیر را روی نقشه دلخواهتان ببینید.</p>
          </div>
          <div className="contact-grid">
            <a href={`tel:${c.phone}`} className="c-card c-card-phone" data-reveal>
              <div className="c-icon"><IconPhone className="ico" /></div>
              <div>
                <span className="c-label">تماس ثابت</span>
                <b className="c-value c-rtl-num" dir="ltr">{c.phone_display}</b>
                <span className="c-hint">شنبه تا پنجشنبه · ۹ تا ۱۹</span>
              </div>
            </a>
            {c.mobile ? (
              <a href={`tel:${c.mobile}`} className="c-card c-card-phone" data-reveal data-delay="1">
                <div className="c-icon"><IconMobile className="ico" /></div>
                <div>
                  <span className="c-label">موبایل / واتس‌اپ</span>
                  <b className="c-value c-rtl-num" dir="ltr">{c.mobile_display}</b>
                  <span className="c-hint">پاسخگویی سریع</span>
                </div>
              </a>
            ) : null}
            <div className="c-card c-card-address" data-reveal data-delay="2">
              <div className="c-icon"><IconPin className="ico" /></div>
              <div>
                <span className="c-label">آدرس فروشگاه</span>
                <b className="c-value">{c.address}</b>
              </div>
            </div>
          </div>
          <div className="map-cta" data-reveal>
            <span className="map-label">مسیر را روی نقشه ببینید:</span>
            <div className="map-btns">
              <a href={c.map_google} target="_blank" rel="noopener" className="btn btn-ghost map-btn">
                <IconPin className="ico" />
                گوگل‌مپ
              </a>
              <a href={c.map_neshan} target="_blank" rel="noopener" className="btn btn-ghost map-btn">
                <IconPin className="ico" />
                نشان
              </a>
              <a href={c.map_balad} target="_blank" rel="noopener" className="btn btn-ghost map-btn">
                <IconPin className="ico" />
                بلد
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CTA نهایی ================= */}
      <section className="final-cta">
        <div className="container">
          <h2 className="final-title" data-reveal>یک <em className="grad-text">تماس</em> کافیه</h2>
          <p data-reveal data-delay="1">قیمت روز، موجودی دقیق و مشاوره تخصصی — همه در یک تماس.</p>
          <a href={`tel:${c.phone}`} className="btn btn-primary btn-xl" data-reveal data-delay="2">
            <IconPhone />
            همین حالا تماس بگیرید
          </a>
        </div>
      </section>
    </>
  );
}
