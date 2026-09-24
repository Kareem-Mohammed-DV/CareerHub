import { Link } from 'react-router-dom';
export default function NotFound() { return <main className="route-state not-found"><p className="eyebrow">404 · SIGNAL LOST</p><div className="not-found-number">404</div><h1>This page isn’t in your orbit.</h1><p>The address may have changed or the page may have moved.</p><Link to="/" className="primary-button">Return home</Link></main>; }
