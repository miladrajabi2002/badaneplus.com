import { buildSiteData, makeLinkifier, visiblePosts, blogPostingSchema, breadcrumbSchema } from '@/lib/data';
import { faNum, jdate } from '@/lib/format';
import { IconPhone } from '@/components/icons';

export const dynamicParams = false;

export function generateStaticParams() {
  // فقط پست‌های قابل نمایش صفحه می‌گیرند (رفع باگ نسخه پایتون)
  return visiblePosts(buildSiteData().posts).map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }) {
  const { posts } = buildSiteData();
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.meta_description,
    alternates: { canonical: `https://badaneplus.com/blog/${post.slug}/` },
  };
}

export default function PostPage({ params }) {
  const { settings, posts, cars } = buildSiteData();
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) return null;

  const c = settings.contact || {};
  const base = (settings.site || {}).url || 'https://badaneplus.com';
  const imgDir = String(post.image || '').startsWith('b-') ? 'blog' : 'products';
  const coverUrl = `${base}/assets/img/${imgDir}/${post.image}-card.webp`;
  const linkify = makeLinkifier(cars);
  const related = visiblePosts(posts).filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema(post, base, coverUrl)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([
        { name: 'خانه', url: `${base}/` },
        { name: 'وبلاگ', url: `${base}/blog/` },
        { name: post.title, url: `${base}/blog/${post.slug}/` },
      ])) }} />

      <article className="hero post-hero">
        <div className="hero-bg" aria-hidden="true">
          <div className="hero-grid"></div>
          <div className="hero-glow"></div>
        </div>
        <div className="container">
          <nav className="breadcrumb" aria-label="مسیر"><a href="/">خانه</a><span>›</span><a href="/blog/">وبلاگ</a><span>›</span><b>{post.category}</b></nav>
          <div className="post-hero-copy">
            <div className="post-meta" data-reveal>
              <span className="b-cat">{post.category}</span>
              <span>·</span>
              <span>{faNum(post.read_time)} دقیقه مطالعه</span>
              <span>·</span>
              <span>{jdate(post.date)}</span>
            </div>
            <h1 className="post-title" data-reveal data-delay="1">{post.h1 || post.title}</h1>
            <p className="post-excerpt" data-reveal data-delay="2">{post.excerpt}</p>
          </div>
          <div className="post-cover" data-reveal data-delay="2">
            <img src={`/assets/img/${imgDir}/${post.image}-full.webp`} alt={post.title} width="1344" height="768" fetchPriority="high" decoding="async" />
          </div>
        </div>
      </article>

      <div className="section section-light">
        <div className="container post-layout">
          <div className="post-content">
            {(post.blocks || []).map((b, i) => {
              if (b.type === 'p') return <p key={i} dangerouslySetInnerHTML={{ __html: linkify(b.text) }} />;
              if (b.type === 'h2') return <h2 key={i}>{b.text}</h2>;
              if (b.type === 'h3') return <h3 key={i}>{b.text}</h3>;
              if (b.type === 'list') {
                return (
                  <ul className="post-list" key={i}>
                    {(b.items || []).map((item, j) => <li key={j} dangerouslySetInnerHTML={{ __html: linkify(item) }} />)}
                  </ul>
                );
              }
              if (b.type === 'tip') {
                return (
                  <aside className="post-tip" key={i}>
                    <b>{b.title || 'نکته بدنه پلاس'}</b>
                    <p>{b.text}</p>
                  </aside>
                );
              }
              if (b.type === 'table') {
                return (
                  <div className="table-wrap" key={i}>
                    <table>
                      <thead><tr>{(b.headers || []).map((h, j) => <th key={j}>{h}</th>)}</tr></thead>
                      <tbody>
                        {(b.rows || []).map((row, j) => <tr key={j}>{row.map((cell, k) => <td key={k}>{cell}</td>)}</tr>)}
                      </tbody>
                    </table>
                  </div>
                );
              }
              if (b.type === 'cta') {
                return (
                  <div className="post-cta" key={i}>
                    <p>{b.text}</p>
                    <a href={b.href || '#contact'} className="btn btn-primary">
                      <IconPhone />
                      {b.label || 'استعلام قیمت تلفنی'}
                    </a>
                  </div>
                );
              }
              return null;
            })}
          </div>
          <aside className="post-sidebar">
            <div className="side-box">
              <h4>سفارش و استعلام</h4>
              <p>قیمت روز و موجودی قطعات بدنه خودروهای ایرانی را تلفنی بپرسید:</p>
              <a href={`tel:${c.phone}`} className="btn btn-primary btn-block">
                <IconPhone />
                {c.phone_display}
              </a>
              <ul className="side-list">
                <li>🛡 ۵ سال ضمانت رنگ</li>
                <li>🏭 قطعات فابریک و رنگ کوره‌ای</li>
                <li>🚚 ارسال به سراسر کشور</li>
              </ul>
            </div>
            {related.length > 0 ? (
              <div className="side-box">
                <h4>مقالات مرتبط</h4>
                {related.map((r) => (
                  <a href={`/blog/${r.slug}/`} className="side-post" key={r.slug}>
                    <b>{r.title}</b>
                    <span>{faNum(r.read_time)} دقیقه مطالعه</span>
                  </a>
                ))}
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </>
  );
}
