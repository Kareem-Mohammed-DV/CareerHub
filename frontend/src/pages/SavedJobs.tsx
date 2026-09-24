import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { usePageTitle } from '../hooks/usePageTitle';

type SavedJob = {
  jobId: string;
  createdAt: string;
  job: {
    id: string; title: string; location: string | null; employmentType: string; workplaceType: string;
    salaryMin: number | null; salaryMax: number | null; currency: string;
    company: { name: string; slug: string; logoUrl: string | null };
  };
};

export default function SavedJobs() {
  usePageTitle('Saved jobs');
  const [items, setItems] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError('');
    try { setItems(await api<SavedJob[]>('/jobs/saved/me')); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Failed to load saved jobs.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function unsave(jobId: string) {
    setBusy(jobId);
    try { await api(`/jobs/${jobId}/saved`, { method: 'DELETE' }); setItems((current) => current.filter((item) => item.jobId !== jobId)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not remove this job.'); }
    finally { setBusy(null); }
  }

  return (
    <main className="jobs-page"><section className="jobs-container">
      <header className="applications-top"><div>
        <span className="applications-label">CAREERHUB · BOOKMARKS</span>
        <h1>Saved jobs</h1>
        <p>Roles you bookmarked to revisit later.</p>
      </div><Link to="/jobs" className="applications-button">Find more</Link></header>
      {error && <p className="message error" role="alert">{error}</p>}
      {loading ? <div className="applications-loading"><div className="jobs-loader" /><h2>Loading saved jobs…</h2></div>
        : items.length === 0 ? <div className="applications-empty"><h2>Nothing saved yet</h2><p>Tap “Save job” on any listing and it will wait for you here.</p><Link to="/jobs" className="applications-button">Browse jobs</Link></div>
          : <div className="applications-grid">{items.map((item) => (
            <article key={item.jobId} className="application-item">
              <div className="application-content">
                <span className="application-company">{item.job.company.name}</span>
                <h2>{item.job.title}</h2>
                <p className="application-location">{item.job.location ?? 'Flexible location'} · {item.job.workplaceType}</p>
                {(item.job.salaryMin || item.job.salaryMax) && <p className="application-applied">{item.job.salaryMin ?? ''}{item.job.salaryMin && item.job.salaryMax ? '–' : ''}{item.job.salaryMax ?? ''} {item.job.currency}</p>}
              </div>
              <div className="application-card-actions">
                <Link to={`/jobs/${item.jobId}`} className="secondary-button">View job</Link>
                <button className="secondary-button" type="button" disabled={busy === item.jobId} onClick={() => unsave(item.jobId)}>{busy === item.jobId ? 'Removing…' : 'Remove'}</button>
              </div>
            </article>
          ))}</div>}
    </section></main>
  );
}
