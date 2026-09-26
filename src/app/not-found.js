export const dynamicParams = false;

export function generateMetadata() {
  return {
    title: 'صفحه پیدا نشد | بدنه پلاس',
    description: 'صفحه مورد نظر پیدا نشد.',
  };
}

export default function NotFound() {
  return (
    <section className="hero" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center' }}>
      <div className="hero-bg" aria-hidden="true">
        <div className="hero-grid"></div>
        <div className="hero-glow"></div>
      </div>
      <div className="container" style={{ textAlign: 'center' }}>
        <h1 className="hero-title"><span className="line" data-reveal>۴۰۴</span></h1>
        <p className="hero-sub" data-reveal data-delay="1">این صفحه در انبار ما پیدا نشد! شاید آدرس عوض شده باشد.</p>
        <div className="hero-cta" data-reveal data-delay="2" style={{ justifyContent: 'center' }}>
          <a href="/" className="btn btn-primary btn-lg">بازگشت به خانه</a>
          <a href="/blog/" className="btn btn-ghost btn-lg">وبلاگ</a>
        </div>
      </div>
    </section>
  );
}
