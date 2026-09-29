import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiEnvelope } from '../api/client';
import type { Job } from '../api/jobs';

type ShelfMeta = { reason?: string; category?: string };

type JobsShelfProps = {
    /** API path, e.g. /job-recommendations/me?limit=3 */
    path: string;
    heading: string;
    subtitle?: string;
    viewAllTo?: string;
    viewAllLabel?: string;
    /** Hide the API's "reason" line (used when it duplicates the heading). */
    hideMetaLine?: boolean;
};

/**
 * A reusable row of recommended jobs (dashboard recommendations,
 * similar jobs on the job details page). Hides itself when the API
 * returns nothing, so pages never show an empty shelf.
 */
export default function JobsShelf({
    path,
    heading,
    subtitle,
    viewAllTo = '/jobs',
    viewAllLabel = 'View all',
    hideMetaLine = false,
}: JobsShelfProps) {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [meta, setMeta] = useState<ShelfMeta>({});
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let active = true;

        apiEnvelope<Job[]>(path)
            .then((body) => {
                if (!active) return;
                setJobs(Array.isArray(body.data) ? body.data : []);
                setMeta((body.meta as ShelfMeta | undefined) ?? {});
            })
            .catch(() => {
                if (active) setFailed(true);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [path]);

    if (loading) {
        return (
            <section className="jobs-shelf" aria-label={heading}>
                <div className="jobs-shelf-heading">
                    <div>
                        <span className="applications-label">
                            RECOMMENDED
                        </span>
                        <h2>{heading}</h2>
                    </div>
                </div>
                <div className="jobs-loader" />
            </section>
        );
    }

    if (failed || jobs.length === 0) return null;

    return (
        <section className="jobs-shelf" aria-label={heading}>
            <div className="jobs-shelf-heading">
                <div>
                    <span className="applications-label">
                        RECOMMENDED
                    </span>
                    <h2>{heading}</h2>
                    {(!hideMetaLine && (meta.reason || subtitle)) ? (
                        <p className="jobs-shelf-reason">
                            {meta.reason ?? subtitle}
                        </p>
                    ) : null}
                </div>

                <Link to={viewAllTo} className="text-link">
                    {viewAllLabel} →
                </Link>
            </div>

            <div className="applications-grid">
                {jobs.map((job) => (
                    <article
                        key={job.id}
                        className="application-item job-shelf-card"
                    >
                        <div className="application-content">
                            <span className="application-company">
                                {job.isFeatured
                                    ? '★ FEATURED'
                                    : job.company.name}
                            </span>

                            <h2>
                                <Link to={`/jobs/${job.id}`}>
                                    {job.title}
                                </Link>
                            </h2>

                            <p className="application-location">
                                {job.location || 'Flexible location'}
                                {' · '}
                                {job.employmentType.replace('_', ' ')}
                            </p>

                            <p className="application-applied">
                                {job.salaryMin || job.salaryMax
                                    ? `${job.salaryMin?.toLocaleString() ?? '—'} – ${job.salaryMax?.toLocaleString() ?? '—'} ${job.currency}`
                                    : 'Salary not listed'}
                            </p>
                        </div>

                        <div className="job-shelf-footer">
                            <Link
                                to={`/company/${job.company.slug}`}
                                className="text-link"
                            >
                                {job.company.name}
                            </Link>

                            <Link
                                to={`/jobs/${job.id}`}
                                className="applications-button"
                            >
                                View
                            </Link>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}
