import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Logo size={30} />
          <div>
            <strong>CareerHub</strong>
            <p>Next generation career platform — connecting talent with opportunity.</p>
          </div>
        </div>
        <nav className="site-footer-links" aria-label="Footer">
          <Link to="/jobs">Jobs</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/register">Create account</Link>
          <Link to="/login">Sign in</Link>
        </nav>
        <p className="site-footer-credit">© {new Date().getFullYear()} CareerHub — crafted by Kareem Mohamed Bakr.</p>
      </div>
    </footer>
  );
}
