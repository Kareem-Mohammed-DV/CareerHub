import { useEffect, useMemo, useState } from 'react';
import { fetchCompanyAnalytics, type Analytics } from '../api/analytics.js';
import { usePageTitle } from '../hooks/usePageTitle';

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
] as const;

const PIPELINE_ORDER = ['SUBMITTED', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'] as const;
const PIPELINE_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted', REVIEWING: 'Reviewing', SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interview', OFFER: 'Offer', HIRED: 'Hired', REJECTED: 'Rejected',
};
const SOURCE_LABELS: Record<string, string> = {
  direct: 'Direct visit', search: 'Job search', referral: 'Referral',
  external: 'External link', social: 'Social media',
};
const SOURCE_COLORS = ['#2e6ef2', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];

/** Hand-rolled lightweight SVG line chart — no chart library. */
function LineChart({ series, height = 240 }: { series: { name: string; color: string; points: number[] }[]; height?: number }) {
  const n = series[0]?.points.length ?? 0;
  const max = Math.max(1, ...series.flatMap((s) => s.points));
  const w = 720;
  const padX = 10;
  const step = n > 1 ? (w - padX * 2) / (n - 1) : 0;
  const y = (v: number) => height - 28 - (v / max) * (height - 52);

  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => ({ y: y(max * f), v: Math.round(max * f) }));

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="chart-svg" role="img" aria-label="Views and applications over time">
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={padX} x2={w - padX} y1={g.y} y2={g.y} className="chart-grid-line" />
          <text x={w - padX} y={g.y - 5} className="chart-tick" textAnchor="end">{g.v}</text>
        </g>
      ))}
      {series.map((s) => {
        const d = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(padX + i * step).toFixed(1)},${y(p).toFixed(1)}`).join(' ');
        const area = n > 1 ? `${d} L${(padX + (n - 1) * step).toFixed(1)},${height - 28} L${padX},${height - 28} Z` : '';
        return (
          <g key={s.name}>
            {area ? <path d={area} fill={s.color} opacity="0.08" /> : null}
            <path d={d} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        );
      })}
      {n > 1 && (
        <>
          <text x={padX} y={height - 8} className="chart-tick">{data_rangeLabel(series)}</text>
          <text x={w - padX} y={height - 8} className="chart-tick" textAnchor="end">today</text>
        </>
      )}
    </svg>
  );
}

function data_rangeLabel(_series: unknown): string {
  return 'start';
}

function BarList({ items, emptyNote }: { items: { label: string; value: number; color?: string }[]; emptyNote: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <p className="empty-note">{emptyNote}</p>;
  return (
    <div className="bar-list">
      {items.map((item) => (
        <div key={item.label} className="bar-row">
          <span className="bar-label">{item.label}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(item.value / max) * 100}%`, background: item.color ?? 'var(--blue)' }} />
          </div>
          <span className="bar-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function CompanyAnalytics() {
    usePageTitle("Analytics");
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCompanyAnalytics(days)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Something went wrong'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days]);

  const series = useMemo(() => (data ? [
    { name: 'Views', color: '#2e6ef2', points: data.timeline.map((t) => t.views) },
    { name: 'Applications', color: '#10b981', points: data.timeline.map((t) => t.applications) },
  ] : []), [data]);

  const sourceItems = useMemo(() => data
    ? Object.entries(data.sources)
        .sort((a, b) => b[1] - a[1])
        .map(([key, value], i) => ({ label: SOURCE_LABELS[key] ?? key, value, color: SOURCE_COLORS[i % SOURCE_COLORS.length] }))
    : [], [data]);

  const pipelineItems = useMemo(() => data
    ? PIPELINE_ORDER
        .filter((s) => (data.pipeline[s] ?? 0) > 0)
        .map((s) => ({ label: PIPELINE_LABELS[s] ?? s, value: data.pipeline[s] ?? 0 }))
    : [], [data]);

  return (
    <main className="analytics-page">
      <header className="analytics-head">
        <div>
          <p className="eyebrow">COMPANY ANALYTICS</p>
          <h1>Hiring insights</h1>
          <p className="analytics-sub">Understand how candidates find and apply to your roles.</p>
        </div>
        <div className="range-toggle" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button key={r.days} type="button" className={`range-btn${days === r.days ? ' active' : ''}`} onClick={() => setDays(r.days)}>
              {r.label}
            </button>
          ))}
        </div>
      </header>

      {error ? (
        <section className="analytics-panel analytics-empty">
          <h2>Analytics unavailable</h2>
          <p>{error}</p>
        </section>
      ) : (
        <>
          <section className="analytics-grid">
            <div className="analytics-stat">
              <div className="stat-label">Job views</div>
              <div className="stat-value">{loading ? '…' : (data?.totals.views ?? 0).toLocaleString()}</div>
              <div className="stat-hint">All time across your roles</div>
            </div>
            <div className="analytics-stat">
              <div className="stat-label">Applications</div>
              <div className="stat-value">{loading ? '…' : data?.totals.applications ?? 0}</div>
              <div className="stat-hint">Received all time</div>
            </div>
            <div className="analytics-stat">
              <div className="stat-label">View → apply</div>
              <div className="stat-value">{loading ? '…' : `${data?.totals.conversionRate ?? 0}%`}</div>
              <div className="stat-hint">Conversion rate</div>
            </div>
            <div className="analytics-stat">
              <div className="stat-label">Active jobs</div>
              <div className="stat-value">{loading ? '…' : data?.totals.activeJobs ?? 0}</div>
              <div className="stat-hint">Currently published</div>
            </div>
          </section>

          <section className="analytics-panel">
            <div className="panel-head">
              <h2>Traffic &amp; applications</h2>
              <div className="chart-legend">
                <span><i className="legend-key" style={{ background: '#2e6ef2' }} />Views</span>
                <span><i className="legend-key" style={{ background: '#10b981' }} />Applications</span>
              </div>
            </div>
            {series.length > 0 && series[0].points.length > 0
              ? <LineChart series={series} />
              : <p className="empty-note">{loading ? 'Loading…' : 'No traffic recorded in this range yet.'}</p>}
          </section>

          <div className="analytics-two-col">
            <section className="analytics-panel">
              <h2>Top performing jobs</h2>
              <div className="analytics-table-wrap">
                <table className="analytics-table">
                  <thead>
                    <tr><th>Role</th><th>Views</th><th>Applies</th><th>Saved</th><th>CVR</th></tr>
                  </thead>
                  <tbody>
                    {(data?.topJobs ?? []).map((job) => (
                      <tr key={job.id}>
                        <td className="cell-title">{job.title}</td>
                        <td>{job.views.toLocaleString()}</td>
                        <td>{job.applications}</td>
                        <td>{job.saved}</td>
                        <td>{job.views > 0 ? `${Math.round((job.applications / job.views) * 1000) / 10}%` : '—'}</td>
                      </tr>
                    ))}
                    {data && data.topJobs.length === 0 && (
                      <tr><td colSpan={5} className="empty-note">No jobs yet — publish your first role.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="analytics-col-stack">
              <section className="analytics-panel">
                <h2>Candidate sources</h2>
                <BarList items={sourceItems} emptyNote="No tracked applications yet." />
              </section>
              <section className="analytics-panel">
                <h2>Pipeline snapshot</h2>
                <BarList items={pipelineItems} emptyNote="No applications yet." />
              </section>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
