import { CONTACT_EMAIL, SERVICES } from "@/lib/services";

export function SiteFooter() {
  const live = SERVICES.filter((service) => service.href !== null);

  return (
    <footer className="footer">
      <div className="footer-row">
        <nav className="footer-links" aria-label="서비스 바로가기">
          {live.map((service) => (
            <a key={service.id} href={service.href}>
              {service.name}
            </a>
          ))}
        </nav>
        <nav className="footer-links" aria-label="안내">
          <a href="/terms">이용약관</a>
          <a href="/privacy">개인정보처리방침</a>
          <a href={`mailto:${CONTACT_EMAIL}`}>문의 {CONTACT_EMAIL}</a>
        </nav>
      </div>
      <p className="footer-copy">Copyright ⓒ 2026 Leju-June. All rights reserved.</p>
    </footer>
  );
}
