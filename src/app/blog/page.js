import { buildSiteData, visiblePosts } from '@/lib/data';
import { faNum, jdate } from '@/lib/format';

export const dynamicParams = false;

export function generateMetadata() {
  return {
    title: 'وبلاگ بدنه پلاس | راهنمای خرید لوازم بدنه و دانش خودرو',
    description: 'مقالات تخصصی لوازم بدنه خودروهای ایرانی؛ راهنمای خرید کاپوت، سپر، گلگیر و سینی فن، تفاوت رنگ کوره‌ای و نکات نگهداری رنگ خودرو.',
    alternates: { canonical: 'https://badaneplus.com/blog/' },
  };
}

export default function BlogIndexPage() {
  const { posts } = buildSiteData();
  const shown = visiblePosts(posts);

  return (
    <>
      <section className="hero blog-hero">
        <div className="hero-bg" aria-hidden="true">
          <div className="hero-grid"></div>
          <div className="hero-glow"></div>
        </div>
        <div className="container">
          <nav className="breadcrumb" aria-label="مسیر"><a href="/">خانه</a><span>›</span><b>وبلاگ</b></nav>
          <div className="hero-copy">
            <div className="hero-badge" data-reveal><span className="pulse-dot"></span>وبلاگ بدنه پلاس</div>
            <h1 className="hero-title"><span className="line grad-text" data-reveal data-delay="1">راهنمای خرید و دانش خودرو</span></h1>
            <p className="hero-sub" data-reveal data-delay="2">تجربه سال‌ها فروش لوازم بدنه خودروهای ایرانی، در قالب مقاله‌های کاربردی؛ از تشخیص قطعه فابریک تا نگهداری رنگ کوره‌ای.</p>
          </div>
        </div>
      </section>

      <section className="section section-light">
        <div className="container">
          <div className="blog-grid blog-grid-full">
            {shown.map((post, i) => {
              const imgDir = String(post.image || '').startsWith('b-') ? 'blog' : 'products';
              return (
                <a href={`/blog/${post.slug}/`} className="b-card" data-reveal data-delay={(i % 3) + 1} key={post.slug}>
                  <div className="b-media">
                    <img src={`/assets/img/${imgDir}/${post.image}-card.webp`} alt={post.title} width="880" height="503" loading="lazy" decoding="async" />
                  </div>
                  <div className="b-info">
                    <div className="b-meta">
                      <span className="b-cat">{post.category}</span>
                      <span>·</span>
                      <span>{faNum(post.read_time)} دقیقه</span>
                      <span>·</span>
                      <span>{jdate(post.date)}</span>
                    </div>
                    <h3 className="b-title">{post.title}</h3>
                    <p className="b-excerpt">{post.excerpt}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
