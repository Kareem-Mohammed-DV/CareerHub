import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiEnvelope } from '../api/client';
import { usePageTitle } from '../hooks/usePageTitle';

type CompanyCard = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  industry: string | null;
  location: string | null;
  logoUrl: string | null;
  _count: { jobs: number };
};

export default function Companies() {
  usePageTitle('Companies');
  const [companies, setCompanies] = useState<CompanyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  async function load(currentPage = page, query = q) {
    try {
      setLoading(true);
      setError('');
      const result = await apiEnvelope<CompanyCard[]>(`/companies?page=${currentPage}&limit=12${query.trim() ? `&q=${encodeURIComponent(query.trim())}` : ''}`);
      setCompanies(result.data ?? []);
      setTotalPages(result.meta?.totalPages ?? 1);
      setTotalResults(result.meta?.total ?? result.data?.length ?? 0);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to load companies.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function search(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    load(1);
  }

  return (
    <main className="jobs-page">
      <section className="jobs-header">
        <div className="jobs-header-grid" data-reveal>
          <div className="jobs-header-content">
            <div className="jobs-header-kicker">
              <span className="jobs-kicker-line" />
              <span>CAREERHUB / COMPANIES</span>
            </div>
            <p className="eyebrow">VERIFIED HIRING TEAMS</p>
            <h1>
              Discover
              <span> great companies.</span>
            </h1>
            <p className="jobs-header-description">
              Browse verified companies hiring on CareerHub and explore
              their open roles.
            </p>
            <div className="jobs-header-meta">
              <div>
                <strong>{totalResults > 0 ? String(totalResults).padStart(2, '0') : '00'}</strong>
                <span>COMPANIES</span>
              </div>
              <div>
                <strong>100%</strong>
                <span>VERIFIED</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="jobs-container">
        <form className="jobs-filters" onSubmit={search} data-reveal>
          <div className="jobs-filter-heading">
            <div>
              <p className="eyebrow">DIRECTORY</p>
              <h2>
                Find the right
                <span> team.</span>
              </h2>
            </div>
            <div className="jobs-filter-status">
              <span className="status-dot" />
              <span>Live directory</span>
            </div>
          </div>
          <div className="jobs-filter-fields">
            <input
              aria-label="Search companies"
              placeholder="Search by name or industry…"
              value={q}
              onChange={(event) => setQ(event.target.value)}
            />
            <button className="primary-button" type="submit">Search</button>
          </div>
        </form>

        {loading && (
          <div className="jobs-state" data-reveal>
            <div className="jobs-loader" />
            <h2>Loading companies…</h2>
          </div>
        )}

        {error && (
          <div className="jobs-state" data-reveal>
            <p className="eyebrow">OFFLINE</p>
            <h2>Something went wrong</h2>
            <p>{error}</p>
            <button className="secondary-button" type="button" onClick={() => load(1)}>Try again</button>
          </div>
        )}

        {!loading && !error && companies.length === 0 && (
          <div className="jobs-state" data-reveal>
            <div className="empty-jobs-icon">⌕</div>
            <p className="eyebrow">NO MATCHES</p>
            <h2>No companies found</h2>
            <p>Try a different search, or explore the open roles directly.</p>
            <Link to="/jobs" className="applications-button">Browse jobs</Link>
          </div>
        )}

        {!loading && !error && companies.length > 0 && (
          <>
            {!loading && !error && (
              <div className="jobs-results-count">
                <strong>{totalResults}</strong>
                <span>{totalResults === 1 ? 'COMPANY' : 'COMPANIES'}</span>
              </div>
            )}
            <div className="jobs-grid">
              {companies.map((company, index) => (
                <article className="job-card" key={company.id} data-reveal>
                  <div className="job-card-number">{String(index + 1).padStart(2, '0')}</div>
                  <div className="job-card-top">
                    <div className="company-logo">
                      {company.logoUrl
                        ? <img src={company.logoUrl} alt={`${company.name} logo`} />
                        : <span aria-hidden="true">{company.name.slice(0, 1).toUpperCase()}</span>}
                    </div>
                    <div>
                      <p className="company-name">{company.name}</p>
                      <p className="job-location">
                        <span>⌖</span>
                        {company.location || company.industry || 'Worldwide'}
                      </p>
                    </div>
                  </div>
                  {company.description && <p className="job-description">{company.description}</p>}
                  <div className="job-tags">
                    {company.industry && <span>{company.industry}</span>}
                    <span>{company._count.jobs} open role{company._count.jobs === 1 ? '' : 's'}</span>
                  </div>
                  <div className="job-card-actions">
                    <Link to={`/company/${company.slug}`} className="primary-button">
                      View company
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="jobs-pagination" data-reveal>
                <button type="button" disabled={page === 1} onClick={() => { const next = page - 1; setPage(next); load(next); }}>← Previous</button>
                <span>Page {page} of {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => { const next = page + 1; setPage(next); load(next); }}>Next →</button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
