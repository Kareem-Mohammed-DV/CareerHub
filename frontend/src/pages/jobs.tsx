import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getJobs, type Job } from '../api/jobs';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import { usePageTitle } from '../hooks/usePageTitle';

const experienceOptions = [
    { value: '', label: 'All experience levels' },
    { value: 'ENTRY', label: 'Entry Level' },
    { value: 'JUNIOR', label: 'Junior' },
    { value: 'MID', label: 'Mid Level' },
    { value: 'SENIOR', label: 'Senior' },
    { value: 'LEAD', label: 'Lead' },
    { value: 'EXECUTIVE', label: 'Executive' },
];

export default function Jobs() {
    usePageTitle("Find jobs");
    const { user } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [q, setQ] = useState('');
    const [category, setCategory] = useState('');
    const [location, setLocation] = useState('');
    const [experienceLevel, setExperienceLevel] = useState('');
    const [salaryMin, setSalaryMin] = useState('');

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalResults, setTotalResults] = useState(0);
    const [savedIds, setSavedIds] = useState<string[]>([]);
    const [saveError, setSaveError] = useState('');

    async function loadJobs(currentPage = page, override: Partial<{ q: string; category: string; location: string; experienceLevel: string; salaryMin: string }> = {}) {
        try {
            setLoading(true);
            setError('');

            const response = await getJobs({
                q: (override.q ?? q).trim() || undefined,
                category: (override.category ?? category).trim() || undefined,
                location: (override.location ?? location).trim() || undefined,
                experienceLevel: (override.experienceLevel ?? experienceLevel) || undefined,
                salaryMin: (override.salaryMin ?? salaryMin) || undefined,
                page: currentPage,
                limit: 12,
            });

            setJobs(response.data);
            setTotalPages(response.meta.totalPages);
            setTotalResults(response.meta.total);
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : 'Failed to load jobs'
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadJobs(1);

        // Initial load only.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (user?.role !== 'JOB_SEEKER') { setSavedIds([]); return; }
        api<{ jobId: string }[]>('/jobs/saved/me').then((items) => setSavedIds(items.map((item) => item.jobId))).catch(() => setSavedIds([]));
    }, [user?.role]);

    async function toggleSaved(jobId: string) {
        setSaveError('');
        if (!user) { setSaveError('Sign in as a job seeker to save jobs.'); return; }
        if (user.role !== 'JOB_SEEKER') return;
        const isSaved = savedIds.includes(jobId);
        try {
            await api<void>(`/jobs/${jobId}/saved`, { method: isSaved ? 'DELETE' : 'POST' });
            setSavedIds((current) => isSaved ? current.filter((id) => id !== jobId) : [...current, jobId]);
        } catch (reason) { setSaveError(reason instanceof Error ? reason.message : 'Could not save this job.'); }
    }

    function handleSearch(event: FormEvent) {
        event.preventDefault();

        setPage(1);
        loadJobs(1);
    }

    function resetFilters() {
        setQ('');
        setCategory('');
        setLocation('');
        setExperienceLevel('');
        setSalaryMin('');
        setPage(1);

        loadJobs(1, { q: '', category: '', location: '', experienceLevel: '', salaryMin: '' });
    }

    function changePage(nextPage: number) {
        if (
            nextPage < 1 ||
            (totalPages > 0 &&
                nextPage > totalPages)
        ) {
            return;
        }

        setPage(nextPage);
        loadJobs(nextPage);

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    }

    return (
        <main className="jobs-page">

            {/* =====================================================
                HERO
            ===================================================== */}

            <section className="jobs-header">

                <div
                    className="jobs-header-grid"
                    data-reveal
                >

                    <div className="jobs-header-content">

                        <div className="jobs-header-kicker">
                            <span className="jobs-kicker-line" />
                            <span>CAREERHUB / OPPORTUNITIES</span>
                        </div>

                        <p className="eyebrow">
                            NEXT GENERATION CAREER PLATFORM
                        </p>

                        <h1>
                            Find your
                            <span> next opportunity.</span>
                        </h1>

                        <p className="jobs-header-description">
                            Explore opportunities that match
                            your skills, experience, and career
                            goals. Your next move starts here.
                        </p>

                        <div className="jobs-header-meta">

                            <div>
                                <strong>01</strong>
                                <span>SEARCH</span>
                            </div>

                            <div>
                                <strong>02</strong>
                                <span>DISCOVER</span>
                            </div>

                            <div>
                                <strong>03</strong>
                                <span>APPLY</span>
                            </div>

                        </div>

                    </div>

                    {/* =================================================
                        FUTURISTIC VISUAL
                    ================================================= */}

                    <div
                        className="jobs-hero-visual"
                        aria-hidden="true"
                    >

                        <div className="jobs-visual-orbit orbit-one" />
                        <div className="jobs-visual-orbit orbit-two" />
                        <div className="jobs-visual-orbit orbit-three" />

                        <div className="jobs-visual-core">
                            <span>CH</span>
                        </div>

                        <div className="jobs-floating-card jobs-floating-card-one">
                            <span>↗</span>
                            <div>
                                <small>OPPORTUNITY</small>
                                <strong>Frontend Developer</strong>
                            </div>
                        </div>

                        <div className="jobs-floating-card jobs-floating-card-two">
                            <span>✓</span>
                            <div>
                                <small>MATCH STATUS</small>
                                <strong>Profile Active</strong>
                            </div>
                        </div>

                        <div className="jobs-floating-card jobs-floating-card-three">
                            <span>◈</span>
                            <div>
                                <small>CAREER GROWTH</small>
                                <strong>Keep moving forward</strong>
                            </div>
                        </div>

                    </div>

                </div>

            </section>


            {/* =====================================================
                MAIN
            ===================================================== */}

            <section className="jobs-container">

                {/* =================================================
                    SEARCH
                ================================================= */}

                <form
                    className="jobs-filters"
                    onSubmit={handleSearch}
                    data-reveal
                >

                    <div className="jobs-filter-heading">

                        <div>

                            <p className="eyebrow">
                                SEARCH ENGINE
                            </p>

                            <h2>
                                Find the right
                                <span> role.</span>
                            </h2>

                        </div>

                        <div className="jobs-filter-status">
                            <span className="status-dot" />
                            LIVE OPPORTUNITIES
                        </div>

                    </div>


                    {/* Main search */}

                    <div className="jobs-search-row">

                        <label className="jobs-search-main">

                            <span>
                                SEARCH
                            </span>

                            <div className="jobs-input-wrapper">

                                <span className="jobs-input-icon">
                                    ⌕
                                </span>

                                <input
                                    type="search"
                                    value={q}
                                    onChange={(event) =>
                                        setQ(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Job title, skills, or keywords"
                                />

                            </div>

                        </label>

                        <button
                            className="jobs-search-button"
                            type="submit"
                        >
                            <span>Search Jobs</span>
                            <strong>→</strong>
                        </button>

                    </div>


                    {/* Filters */}

                    <div className="jobs-filter-grid">

                        <label>

                            <span>
                                CATEGORY
                            </span>

                            <div className="jobs-input-wrapper">

                                <span className="jobs-input-icon">
                                    ◈
                                </span>

                                <input
                                    type="text"
                                    value={category}
                                    onChange={(event) =>
                                        setCategory(
                                            event.target.value
                                        )
                                    }
                                    placeholder="e.g. Development"
                                />

                            </div>

                        </label>


                        <label>

                            <span>
                                LOCATION
                            </span>

                            <div className="jobs-input-wrapper">

                                <span className="jobs-input-icon">
                                    ⌖
                                </span>

                                <input
                                    type="text"
                                    value={location}
                                    onChange={(event) =>
                                        setLocation(
                                            event.target.value
                                        )
                                    }
                                    placeholder="e.g. Cairo"
                                />

                            </div>

                        </label>


                        <label>

                            <span>
                                EXPERIENCE
                            </span>

                            <div className="jobs-input-wrapper">

                                <span className="jobs-input-icon">
                                    ◎
                                </span>

                                <select
                                    value={
                                        experienceLevel
                                    }
                                    onChange={(event) =>
                                        setExperienceLevel(
                                            event.target.value
                                        )
                                    }
                                >
                                    {experienceOptions.map(
                                        (option) => (
                                            <option
                                                key={
                                                    option.value
                                                }
                                                value={
                                                    option.value
                                                }
                                            >
                                                {
                                                    option.label
                                                }
                                            </option>
                                        )
                                    )}
                                </select>

                            </div>

                        </label>


                        <label>

                            <span>
                                MINIMUM SALARY
                            </span>

                            <div className="jobs-input-wrapper">

                                <span className="jobs-input-icon">
                                    $
                                </span>

                                <input
                                    type="number"
                                    min="0"
                                    value={salaryMin}
                                    onChange={(event) =>
                                        setSalaryMin(
                                            event.target.value
                                        )
                                    }
                                    placeholder="e.g. 10000"
                                />

                            </div>

                        </label>

                    </div>


                    <div className="jobs-filter-actions">

                        <div className="jobs-filter-note">
                            <span>⌁</span>
                            Refine your search to find
                            better matches.
                        </div>

                        <button
                            type="button"
                            className="jobs-reset-button"
                            onClick={
                                resetFilters
                            }
                        >
                            Reset Filters
                            <span>↻</span>
                        </button>

                    </div>

                </form>


                {/* =================================================
                    RESULTS HEADER
                ================================================= */}

                <div
                    className="jobs-results-header"
                    data-reveal
                >

                    <div>

                        <p className="eyebrow">
                            OPPORTUNITIES
                        </p>

                        <h2>
                            Available
                            <span> Jobs.</span>
                        </h2>

                    </div>

                    {!loading &&
                        !error && (
                            <div className="jobs-results-count">

                                <strong>
                                    {totalResults}
                                </strong>

                                <span>
                                    {totalResults === 1 ? 'JOB' : 'JOBS'} FOUND
                                </span>

                            </div>
                        )}

                </div>
                {saveError && <p className="message error" role="alert">{saveError}</p>}


                {/* =================================================
                    LOADING
                ================================================= */}

                {loading && (

                    <div
                        className="jobs-state"
                        data-reveal
                    >

                        <div className="jobs-loader">

                            <span />
                            <span />
                            <span />

                        </div>

                        <p className="eyebrow">
                            SEARCHING NETWORK
                        </p>

                        <h2>
                            Finding opportunities...
                        </h2>

                        <p>
                            Please wait while we
                            load the latest jobs.
                        </p>

                    </div>

                )}


                {/* =================================================
                    ERROR
                ================================================= */}

                {!loading && error && (

                    <div
                        className="jobs-state error"
                        data-reveal
                    >

                        <div className="jobs-state-symbol">
                            !
                        </div>

                        <p className="eyebrow">
                            SYSTEM ERROR
                        </p>

                        <h2>
                            Something went wrong
                        </h2>

                        <p>
                            {error}
                        </p>

                        <button
                            type="button"
                            className="jobs-retry-button"
                            onClick={() =>
                                loadJobs(page)
                            }
                        >
                            Try Again
                            <span>→</span>
                        </button>

                    </div>

                )}


                {/* =================================================
                    EMPTY
                ================================================= */}

                {!loading &&
                    !error &&
                    jobs.length === 0 && (

                        <div
                            className="jobs-state"
                            data-reveal
                        >

                            <div className="empty-jobs-icon">
                                ⌕
                            </div>

                            <p className="eyebrow">
                                NO MATCHES
                            </p>

                            <h2>
                                No jobs found
                            </h2>

                            <p>
                                We couldn't find any
                                jobs matching your
                                current filters.
                                Try changing your
                                search.
                            </p>

                            <button
                                type="button"
                                className="jobs-reset-button"
                                onClick={
                                    resetFilters
                                }
                            >
                                Clear Filters
                                <span>↻</span>
                            </button>

                        </div>

                    )}


                {/* =================================================
                    JOB RESULTS
                ================================================= */}

                {!loading &&
                    !error &&
                    jobs.length > 0 && (

                        <>

                            <div className="jobs-grid">

                                {jobs.map(
                                    (job, index) => (

                                        <article
                                            className="job-card"
                                            key={
                                                job.id
                                            }
                                            data-reveal
                                        >

                                            {/* Card number */}

                                            <div className="job-card-number">
                                                {String(
                                                    index +
                                                    1
                                                ).padStart(
                                                    2,
                                                    '0'
                                                )}
                                            </div>


                                            {/* Company */}

                                            <div className="job-card-top">

                                                <div className="company-logo">

                                                    {job.company
                                                        .logoUrl ? (
                                                        <img
                                                            src={
                                                                job
                                                                    .company
                                                                    .logoUrl
                                                            }
                                                            alt={
                                                                job
                                                                    .company
                                                                    .name
                                                            }
                                                        />
                                                    ) : (
                                                        job
                                                            .company
                                                            .name
                                                            .charAt(
                                                                0
                                                            )
                                                            .toUpperCase()
                                                    )}

                                                </div>

                                                <div>

                                                    <p className="company-name">
                                                        {
                                                            job
                                                                .company
                                                                .name
                                                        }
                                                    </p>

                                                    <p className="job-location">
                                                        <span>
                                                            ⌖
                                                        </span>

                                                        {job.location ||
                                                            'Location not specified'}
                                                    </p>

                                                </div>

                                            </div>


                                            {/* Title */}

                                            <h2>
                                                {
                                                    job.title
                                                }
                                            </h2>


                                            {/* Description */}

                                            <p className="job-description">
                                                {
                                                    job.description
                                                }
                                            </p>


                                            {/* Tags */}

                                            <div className="job-tags">

                                                {job.isFeatured && <span className="featured-badge">★ FEATURED</span>}

                                                <span>
                                                    {
                                                        job.workplaceType
                                                    }
                                                </span>

                                                <span>
                                                    {
                                                        job.employmentType
                                                    }
                                                </span>

                                                <span>
                                                    {
                                                        job.experienceLevel
                                                    }
                                                </span>

                                            </div>


                                            {/* Salary */}

                                            {(job.salaryMin ||
                                                job.salaryMax) && (

                                                    <div className="job-salary">

                                                        <span>
                                                            SALARY
                                                        </span>

                                                        <strong>

                                                            {
                                                                job.salaryMin ??
                                                                ''
                                                            }

                                                            {job.salaryMin &&
                                                                job.salaryMax
                                                                ? ' – '
                                                                : ''}

                                                            {
                                                                job.salaryMax ??
                                                                ''
                                                            }{' '}

                                                            {
                                                                job.currency
                                                            }

                                                        </strong>

                                                    </div>

                                                )}


                                            {/* Action */}

                                            <Link
                                                to={`/jobs/${job.id}`}
                                                className="job-button"
                                            >

                                                <span>
                                                    View Job
                                                </span>

                                                <strong>
                                                    →
                                                </strong>

                                            </Link>
                                            {user?.role === 'JOB_SEEKER' && <button type="button" className="job-save-button" aria-pressed={savedIds.includes(job.id)} onClick={() => toggleSaved(job.id)}>{savedIds.includes(job.id) ? 'Saved ✓' : 'Save job'}</button>}

                                        </article>

                                    )
                                )}

                            </div>


                            {/* =================================================
                                PAGINATION
                            ================================================= */}

                            {totalPages > 1 && (

                                <div
                                    className="jobs-pagination"
                                    data-reveal
                                >

                                    <button
                                        type="button"
                                        onClick={() =>
                                            changePage(
                                                page -
                                                1
                                            )
                                        }
                                        disabled={
                                            page ===
                                            1
                                        }
                                    >
                                        <span>
                                            ←
                                        </span>

                                        Previous
                                    </button>


                                    <div className="jobs-page-indicator">

                                        <span>
                                            PAGE
                                        </span>

                                        <strong>
                                            {page}
                                        </strong>

                                        <span>
                                            /
                                        </span>

                                        <strong>
                                            {
                                                totalPages
                                            }
                                        </strong>

                                    </div>


                                    <button
                                        type="button"
                                        onClick={() =>
                                            changePage(
                                                page +
                                                1
                                            )
                                        }
                                        disabled={
                                            page >=
                                            totalPages
                                        }
                                    >
                                        Next

                                        <span>
                                            →
                                        </span>
                                    </button>

                                </div>

                            )}

                        </>

                    )}

            </section>

        </main>
    );
}
