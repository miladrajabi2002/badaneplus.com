import { priceFmt } from '@/lib/format';
import { IconPlaceholder } from '@/components/icons';

/** نرمال‌سازی مسیر عکس به مطلق (رفع باگ مسیر نسبی در صفحات خودرو) */
function absImg(p) {
  if (!p) return '';
  return '/' + String(p).replace(/^\//, '');
}

/**
 * کارت محصول — مطابق طراحی اصلی
 * showCar: در صفحه اصلی «خودرو · دسته» نمایش داده می‌شود، در صفحه خودرو فقط «دسته»
 */
export default function ProductCard({ p, phone, showCar = true, delay = 1 }) {
  const dataProduct = JSON.stringify({
    id: p.id,
    name: p.name,
    car: (p._car || {}).name || '',
    cat: (p._cat || {}).name || '',
    price: p.price_on_call ? 0 : p.price,
    price_on_call: p.price_on_call,
    badges: p.badges || [],
    colors: p.colors || [],
    desc: p.description || '',
    img: p._img ? absImg(p._img.full) : '',
    in_stock: p.in_stock,
  });

  return (
    <article className="p-card" data-car={p.car} data-cat={p.category} data-reveal data-delay={delay} data-product={dataProduct}>
      <button className="p-media" data-quickview aria-label={`جزئیات ${p.name}`} type="button">
        {p._img ? (
          <img src={p._img.lqip} data-src={absImg(p._img.card)} alt={p.name} width="675" height="900" loading="lazy" decoding="async" className="lazy-img" />
        ) : (
          <div className="p-placeholder"><IconPlaceholder /></div>
        )}
        <div className="p-badges">
          {(p.badges || []).map((b, i) => (
            <span key={b} className={`pbadge pbadge-${i + 1}`}>{b}</span>
          ))}
        </div>
        {p.in_stock === false ? <span className="p-oos">ناموجود</span> : null}
      </button>
      <div className="p-info">
        <div className="p-meta">
          {showCar && (
            <>
              <span className="p-car">{(p._car || {}).name || ''}</span>
              <span className="p-dot" aria-hidden="true"></span>
            </>
          )}
          <span className="p-cat">{(p._cat || {}).name || ''}</span>
        </div>
        <h3 className="p-name">{p.name}</h3>
        <div className="p-foot">
          {p.price_on_call ? (
            <span className="p-price p-price-call">استعلام تلفنی</span>
          ) : (
            <span className="p-price"><b>{priceFmt(p.price)}</b> تومان</span>
          )}
          <a href={`tel:${phone}`} className="p-cta">تماس برای سفارش</a>
        </div>
      </div>
    </article>
  );
}
