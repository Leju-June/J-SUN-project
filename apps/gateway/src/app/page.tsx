import { SunMark } from "@/components/SunMark";
import { SERVICES } from "@/lib/services";

export default function Lobby() {
  return (
    <>
      <section className="hero">
        <SunMark size={96} />
        <h1>J-SUN</h1>
        <p>서비스를 골라 들어가세요.</p>
      </section>

      <ul className="services">
        {SERVICES.map((service) =>
          service.href ? (
            <li key={service.id}>
              <a className="card" href={service.href}>
                <h2>{service.name}</h2>
                <p>{service.description}</p>
                <span className="go">들어가기 →</span>
              </a>
            </li>
          ) : (
            <li key={service.id}>
              <div className="card empty" aria-label="준비 중인 자리">
                <h2>{service.name}</h2>
                <p>{service.description}</p>
              </div>
            </li>
          ),
        )}
      </ul>
    </>
  );
}
