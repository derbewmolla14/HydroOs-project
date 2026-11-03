import { useEffect, useState } from 'react';
import { BriefcaseBusiness, Camera, Check, Droplets, Mail, MapPin, Moon, Phone, Send, ShieldCheck, Sun, Users, Waves } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

export function BrandMark() {
    return <span className="brand-mark" aria-hidden="true"><Droplets size={23} /></span>;
}

export function AppNav() {
    const { language, setLanguage, t } = useLanguage();
    const [dark, setDark] = useState(() => localStorage.getItem('hydroos-theme') !== 'light');
    useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('hydroos-theme', dark ? 'dark' : 'light'); }, [dark]);
    return <header className="top-nav">
        <Link to="/login" className="brand"><BrandMark /><span>Hydro<span>OS</span></span></Link>
        <nav className="nav-links" aria-label="Primary navigation">
            <a href="/">{t.nav.home}</a><a href="#about">{t.nav.about}</a>
        </nav>
        <div className="nav-actions">
            <label className="language-select"><span className="sr-only">{t.nav.language}</span><select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="en">English</option><option value="am">አማርኛ</option></select></label>
            <button type="button" className="icon-button" onClick={() => setDark((value) => !value)} aria-label={t.theme}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <Link to="/login" className="nav-login"><ShieldCheck size={16} />{t.nav.admin}</Link>
        </div>
    </header>;
}

const socialLinks = [
    { label: 'LinkedIn (placeholder)', href: 'https://www.linkedin.com/', icon: BriefcaseBusiness },
    { label: 'Facebook (placeholder)', href: 'https://www.facebook.com/', icon: Users },
    { label: 'Instagram (placeholder)', href: 'https://www.instagram.com/', icon: Camera },
    { label: 'Telegram (placeholder)', href: 'https://t.me/', icon: Send }
];

export function PublicFooter() {
    return <footer className="public-footer">
        <div className="footer-grid">
            <section className="footer-brand">
                <Link to="/login" className="footer-logo"><BrandMark /><span>Hydro<span>OS</span></span></Link>
                <p>Smart Water Management System for efficient water monitoring, management, and conservation.</p>
                <div className="footer-socials" aria-label="Social media links">
                    {socialLinks.map(({ label, href, icon: Icon }) => <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}><Icon size={17} /></a>)}
                </div>
            </section>
            <section className="footer-section">
                <h2>Quick links</h2>
                <nav aria-label="Footer navigation">
                    <a href="/login">Home</a><a href="#about">About Us</a><a href="#features">Features</a><a href="#contact">Contact</a><Link to="/login">Admin</Link>
                </nav>
            </section>
            <section className="footer-section" id="contact">
                <h2>Contact</h2>
                <div className="footer-contact"><span><Mail size={15} /> Email: to be provided</span><span><Phone size={15} /> Phone: to be provided</span><span><MapPin size={15} /> Location: to be provided</span></div>
                <a className="footer-contact-link" href="#contact">Contact Us <span aria-hidden="true">→</span></a>
            </section>
            <section className="footer-section">
                <h2>Resources</h2>
                <nav aria-label="Resource links">
                    <span className="footer-unavailable">Privacy Policy <small>coming soon</small></span>
                    <span className="footer-unavailable">Terms and Conditions <small>coming soon</small></span>
                    <span className="footer-unavailable">Help and Support <small>coming soon</small></span>
                </nav>
            </section>
        </div>
        <div className="footer-bottom"><span>© 2026 HydroOS. All rights reserved.</span><span>Built for better water decisions.</span></div>
    </footer>;
}

export function AuthShell({ children, compact = false }) {
    const { t } = useLanguage();
    return <div className={`auth-page${compact ? ' auth-page-compact' : ''}`}><AppNav /><main className="auth-main">
        {!compact && <section className="auth-hero" id="about"><div className="hero-copy"><p className="eyebrow"><Waves size={16} /> {t.brand}</p><h1>{t.welcome}</h1><p className="hero-lead">{t.hero}</p><p className="hero-description">{t.description}</p><ul className="feature-list" id="features">{t.features.map((feature) => <li key={feature}><span><Check size={15} /></span>{feature}</li>)}</ul></div><div className="water-visual" aria-hidden="true"><div className="visual-ring ring-one" /><div className="visual-ring ring-two" /><div className="visual-drop"><Droplets size={94} /></div><div className="visual-stats"><strong>24/7</strong><span>water intelligence</span></div></div></section>}
        <section className="auth-panel">{children}</section>
    </main><PublicFooter /></div>;
}

export function AuthCard({ children, title, subtitle }) {
    return <div className="auth-card"><div className="mobile-card-brand"><BrandMark /><strong>Hydro<span>OS</span></strong></div><div className="card-heading"><h2>{title}</h2><p>{subtitle}</p></div>{children}</div>;
}
