// آیکون‌های SVG سایت — دقیقاً مطابق نسخه طراحی‌شده
export function IconPhone({ className = 'ico' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" />
    </svg>
  );
}

export function IconArrow({ className = 'ico ico-flip' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M11 4l1.4 1.4L7.8 10H20v2H7.8l4.6 4.6L11 18l-7-7 7-7z" />
    </svg>
  );
}

export function IconClose() {
  return (
    <svg viewBox="0 0 24 24" className="ico" aria-hidden="true">
      <path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z" />
    </svg>
  );
}

export function IconHome() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l9 8h-3v9h-4v-6h-4v6H6v-9H3l9-8z" />
    </svg>
  );
}

export function IconProducts() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 2h2v2h2a2 2 0 0 1 2 2v4l3 3v2h-7v6h-2v-6H4v-2l3-3V6a2 2 0 0 1 2-2h2V2zm-4 13h10l-2-2V6H9v7l-2 2z" />
    </svg>
  );
}

export function IconBlog() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3 6h8v2H8V9zm0 4h8v2H8v-2z" />
    </svg>
  );
}

export function IconPin({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 2a8 8 0 0 0-8 8c0 5.4 8 12 8 12s8-6.6 8-12a8 8 0 0 0-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
    </svg>
  );
}

export function IconMobile() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-5 18a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8z" />
    </svg>
  );
}

export function IconFlame() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2c2 3 3.5 4.5 3.5 7a3.5 3.5 0 0 1-7 0c0-1 .3-1.9.8-2.7C9.8 7.6 10.9 6 12 2zm-7 14c0-2.5 1.3-4.7 3.2-6-.2 1-.3 1.7-.3 2.4 0 2.6 2.1 4.6 4.6 4.6.8 0 1.6-.2 2.3-.6-.6 2.9-3.2 5.1-6.3 5.1-2.5 0-4.5-2.4-3.5-5.5zM19.8 13c.8 1.2 1.2 2.6 1.2 4 0 3-2.4 5.5-5.4 5.5-.9 0-1.7-.2-2.5-.6 2.5-.9 4.3-3.2 4.5-6 .1-1 .1-2 .2-2.9.7-.1 1.4-.1 2 0z" />
    </svg>
  );
}

export function IconChart() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 20h20v2H2v-2zm2-4h4v3H4v-3zm5-6h4v9H9v-9zm5-8h4v17h-4V2z" />
    </svg>
  );
}

export function IconShield({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 1l9 4v6c0 5.5-3.8 10.7-9 12-5.2-1.3-9-6.5-9-12V5l9-4zm-1.2 14.5l6-6-1.4-1.4-4.6 4.6-2.2-2.2-1.4 1.4 3.6 3.6z" />
    </svg>
  );
}

export function IconTruck() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 5h11v9H3V5zm2 2v5h7V7H5zm9 3h4l3 3v4h-7v-7zm2 2v2h3l-2-2h-1zM7 17h6v2H7v-2z" />
    </svg>
  );
}

export function IconChipShield() {
  return (
    <svg viewBox="0 0 24 24" className="ico" aria-hidden="true">
      <path d="M12 2l4 2 4 5-2 5-1 8h-3l-1-6h-2l-1 6H7l-1-8-2-5 4-5 4-2z" />
    </svg>
  );
}

export function IconChipChart() {
  return (
    <svg viewBox="0 0 24 24" className="ico" aria-hidden="true">
      <path d="M3 13h2v7H3v-7zm4-6h2v13H7V7zm4 3h2v10h-2V10zm4-7h2v17h-2V3z" />
    </svg>
  );
}

export function IconStep2() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21.4 11.6l-2.7-2.7c-.4-.4-.9-.6-1.4-.6H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1l1.6-1.6a1.5 1.5 0 0 1 2.1 0L11 18h4.3l1.5-1.5a1.5 1.5 0 0 1 2.1 0l1.4 1.4c.7-.3 1.2-1 1.2-1.9v-2.8c0-.5-.2-1-.6-1.4zM15 13.5c0 .8-.7 1.5-1.5 1.5S12 14.3 12 13.5v-3c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v3z" />
    </svg>
  );
}

export function IconPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 13h2v7H5v-7zm4-6h2v13H9V7zm4 3h2v10h-2V10zm4-7h2v17h-2V3z" />
    </svg>
  );
}
