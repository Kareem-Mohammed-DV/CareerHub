import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCompanyBySlug, type PublicCompany } from '../api/companies-public';

export default function CompanyProfile() {
  const { slug = '' } = useParams(); const [company, setCompany] = useState<PublicCompany | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { getCompanyBySlug(slug).then(setCompany).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not load this company.')).finally(() => setLoading(false)); }, [slug]);
  if (loading) return <main className="jobs-page"><div className="jobs-state"><div className="jobs-loader"/><h2>Loading company…</h2></div></main>;
  if (error || !company) return <main className="jobs-page"><div className="jobs-state"><h1>Company not found</h1><p>{error}</p><Link to="/jobs" className="applications-button">Browse jobs</Link></div></main>;
  return <main className="jobs-page"><section className="jobs-container"><header className="company-hero"><div className="company-mark">{company.logoUrl ? <img src={company.logoUrl} alt={`${company.name} logo`} /> : company.name.slice(0,1)}</div><div><p className="eyebrow">{company.industry ?? 'CAREERHUB COMPANY'}</p><h1>{company.name}</h1><p>{[company.location,company.size].filter(Boolean).join(' · ')}</p>{company.website && <a href={company.website} target="_blank" rel="noreferrer">Visit company website ↗</a>}</div></header>
    <div className="company-layout"><section className="company-about"><p className="eyebrow">ABOUT THE COMPANY</p><h2>Build what comes next.</h2><p>{company.description || 'Learn more about the roles this team is hiring for.'}</p></section><section><div className="section-heading"><div><p className="eyebrow">CAREER OPPORTUNITIES</p><h2>Open positions <span>{company.jobs.length}</span></h2></div></div>{company.jobs.length === 0 ? <div className="jobs-state"><h3>No open positions right now</h3><p>Check back for future opportunities.</p></div> : <div className="company-openings">{company.jobs.map((job) => <article className="company-opening" key={job.id}><div><h3>{job.title}</h3><p>{job.location ?? 'Location flexible'} · {job.employmentType.replace('_',' ')}</p></div><Link to={`/jobs/${job.id}`} className="applications-button">View role</Link></article>)}</div>}</section></div>
  </section></main>;
}
