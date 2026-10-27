import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  PackageCheck,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';

const services = [
  {
    icon: PackageCheck,
    title: 'Arrival Desk',
    text: 'Register expected packages, follow inspection updates, and choose self-pickup or hostel delivery.',
  },
  {
    icon: CalendarDays,
    title: 'Official Gate Date',
    text: 'Plan ahead with published receiving days and official council opening hours.',
  },
  {
    icon: Search,
    title: 'Lost & Found',
    text: 'Report missing belongings, explore found items, and submit a claim securely.',
  },
  {
    icon: Wrench,
    title: 'Hostel Watch',
    text: 'Send maintenance and security issues to the right team and track resolution.',
  },
];

export default function HomePage() {
  return (
    <main className="home">
      <header className="site-nav">
        <Link href="/" className="brand">
          <Image
            src="/assets/landmark-logo.jpeg"
            alt="Landmark University logo"
            width={43}
            height={43}
          />
          <span>
            <b>LANDMARK UNIVERSITY</b>
            <small>CAMPUS CARE</small>
          </span>
        </Link>
        <nav>
          <Link href="#services">Services</Link>
          <Link href="#how">How it works</Link>
          <Link href="/auth?portal=student">Student sign in</Link>
          <Link
            className="nav-cta"
            href="https://portal.lmu.edu.ng/"
            target="_blank"
            rel="noopener noreferrer"
          >
            University Portal <ArrowUpRight size={16} />
          </Link>
          <Link
            className="nav-cta"
            href="https://cms.lmu.edu.ng/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Online Learning <ArrowUpRight size={16} />
          </Link>
          <Link className="nav-cta" href="/auth?portal=council">
            Council access <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-video">
          <Image
            src="/assets/hero.jpeg"
            alt=""
            fill
            priority
            sizes="100vw"
            quality={70}
          />
        </div>
        <div className="hero-shade" />
        <div className="hero-content wrap">
          <div className="hero-copy">
            <div className="pill">
              <Sparkles size={14} /> ONE CAMPUS. ONE CARE PLATFORM.
            </div>
            <h1>
              Campus life,
              <br />
              <em>made simpler.</em>
            </h1>
            <p>
              One trusted place to manage incoming goods, check official gate
              schedules, recover lost belongings, and report hostel issues at
              Landmark University.
            </p>
            <div className="hero-buttons">
              <Link className="button button-gold" href="/auth?portal=student">
                Enter Student Portal <ArrowUpRight size={17} />
              </Link>
              <Link
                className="button button-light"
                href="https://portal.lmu.edu.ng/"
                target="_blank"
                rel="noopener noreferrer"
              >
                LMU University Portal <ArrowUpRight size={17} />
              </Link>
              <Link
                className="button button-light"
                href="https://cms.lmu.edu.ng/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Online Learning Platform <ArrowUpRight size={17} />
              </Link>
              <Link className="button button-outline" href="/auth?portal=council">
                <ShieldCheck size={17} /> Council Access
              </Link>
            </div>
            <div className="hero-proof">
              <span>
                <CheckCircle2 size={15} /> Clear updates
              </span>
              <span>
                <CheckCircle2 size={15} /> Role-based access
              </span>
              <span>
                <CheckCircle2 size={15} /> One connected campus
              </span>
            </div>
          </div>
          <div className="hero-card">
            <div className="hero-card-top">
              <span className="status-dot" /> CAMPUS OPERATIONS HUB
              <span className="hero-card-mark">LMU</span>
            </div>
            <h2>Good care starts with clear information.</h2>
            <p>
              Student services and council teams, connected from submission to
              resolution.
            </p>
            {services.slice(0, 3).map(({ icon: Icon, title, text }) => (
              <div className="hero-mini" key={title}>
                <div className="mini-icon">
                  <Icon size={18} />
                </div>
                <div>
                  <b>{title}</b>
                  <small>{text}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hero-bottom wrap">
          <span>LANDMARK UNIVERSITY · OMU-ARAN, KWARA STATE</span>
          <span>STUDENT SERVICES / COUNCIL OPERATIONS</span>
        </div>
      </section>

      <section className="services-section wrap" id="services">
        <div className="section-heading">
          <div>
            <span className="section-kicker">BUILT AROUND CAMPUS LIFE</span>
            <h2>
              Everyday services,
              <br />
              all in one place.
            </h2>
          </div>
          <p>
            Spend less time chasing updates. Campus Care gives students and
            authorised council teams a shared, organised way to get things
            done.
          </p>
        </div>
        <div className="service-grid">
          {services.map(({ icon: Icon, title, text }, index) => (
            <article className="service-card" key={title}>
              <div className="service-card-top">
                <span className="service-icon">
                  <Icon size={22} />
                </span>
                <span className="service-index">0{index + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
              <Link href="/auth?portal=student">
                Explore service <ArrowUpRight size={15} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="how-section" id="how">
        <div className="wrap how-inner">
          <div>
            <span className="section-kicker">SIMPLE BY DESIGN</span>
            <h2>
              From request
              <br />
              to resolution.
            </h2>
            <p>
              Each request stays connected to the people responsible for
              handling it, with status updates that help everyone know what
              happens next.
            </p>
            <Link className="button button-dark" href="/auth?mode=register">
              Create student account <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="steps">
            <div>
              <span>01</span>
              <div>
                <b>Submit</b>
                <p>Share the details once through a clear, guided form.</p>
              </div>
            </div>
            <div>
              <span>02</span>
              <div>
                <b>Track</b>
                <p>
                  Follow your package or report without visiting an office to
                  ask.
                </p>
              </div>
            </div>
            <div>
              <span>03</span>
              <div>
                <b>Resolve</b>
                <p>
                  Authorised council teams update progress and complete the
                  workflow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="wrap footer-main">
          <Link href="/" className="brand">
            <Image
              src="/assets/landmark-logo.jpeg"
              alt="Landmark University logo"
              width={43}
              height={43}
            />
            <span>
              <b>LANDMARK UNIVERSITY</b>
              <small>CAMPUS CARE</small>
            </span>
          </Link>
          <p>A more organised, transparent campus support experience.</p>
          <div>
            <Link href="/auth?portal=student">Student portal</Link>
            <Link
              href="https://portal.lmu.edu.ng/"
              target="_blank"
              rel="noopener noreferrer"
            >
              University portal
            </Link>
            <Link
              href="https://cms.lmu.edu.ng/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Online learning
            </Link>
            <Link href="/auth?portal=council">Council access</Link>
          </div>
        </div>
        <div className="wrap footer-bottom">
          <span>© {new Date().getFullYear()} Landmark University Campus Care</span>
          <span>Built for care, clarity and accountability.</span>
        </div>
      </footer>
    </main>
  );
}
