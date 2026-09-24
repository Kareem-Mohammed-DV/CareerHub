import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    getMyProfile,
    type JobSeekerProfile,
} from '../api/profiles';
import {
    getMyApplications,
    getMyApplicationSummary,
    type Application,
    type ApplicationSummary,
} from '../api/applications';

export default function JobSeekerDashboard() {
    const [profile, setProfile] =
        useState<JobSeekerProfile | null>(null);

    const [applications, setApplications] =
        useState<Application[]>([]);
    const [summary, setSummary] = useState<ApplicationSummary>({ total: 0, saved: 0, byStatus: {} });

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState('');

    useEffect(() => {
        async function loadDashboard() {
            try {
                setLoading(true);
                setError('');

                const [profileData, applicationsData, summaryData] =
                    await Promise.all([
                        getMyProfile(),
                        getMyApplications(1, 10),
                        getMyApplicationSummary(),
                    ]);

                setProfile(profileData);
                setSummary(summaryData);

                setApplications(
                    Array.isArray(applicationsData?.data)
                        ? applicationsData.data
                        : []
                );
            } catch (error) {
                setError(
                    error instanceof Error
                        ? error.message
                        : 'Failed to load dashboard'
                );
            } finally {
                setLoading(false);
            }
        }

        loadDashboard();
    }, []);

    if (loading) {
        return (
            <main className="jobs-page">
                <section className="jobs-container">
                    <div className="applications-loading">
                        <div className="jobs-loader" />
                        <h2>Loading dashboard...</h2>
                        <p>
                            Please wait while we load your dashboard.
                        </p>
                    </div>
                </section>
            </main>
        );
    }

    if (error) {
        return (
            <main className="jobs-page">
                <section className="jobs-container">
                    <div className="applications-empty">
                        <h1>Unable to load dashboard</h1>

                        <p>{error}</p>

                        <Link
                            to="/jobs"
                            className="applications-button"
                        >
                            Browse Jobs
                        </Link>
                    </div>
                </section>
            </main>
        );
    }

    const fullName =
        `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() ||
        'Job Seeker';
    const completionValues = [profile?.firstName, profile?.lastName, profile?.headline, profile?.bio, profile?.location, profile?.skills?.length ? 'skills' : '', profile?.yearsOfExperience ? 'experience' : ''];
    const profileCompletion = Math.round(completionValues.filter(Boolean).length / completionValues.length * 100);

    return (
        <main className="jobs-page">
            <section className="jobs-container">

                {/* Header */}
                <header className="applications-top">
                    <div>
                        <span className="applications-label">
                            CAREERHUB
                        </span>

                        <h1>Welcome, {fullName}</h1>

                        <p>
                            Manage your profile and track your applications.
                        </p>
                    </div>

                    <Link
                        to="/jobs"
                        className="applications-button"
                    >
                        Browse Jobs
                    </Link>
                </header>

                {/* Profile */}
                <section className="application-item">
                    <div className="application-content">

                        <span className="application-company">
                            YOUR PROFILE
                        </span>

                        <h2>
                            {profile?.headline || 'Complete your profile'}
                        </h2>

                        <p className="application-location">
                            {profile?.location ||
                                'Location not specified'}
                        </p>

                        <p className="application-applied">
                            {profile?.skills?.length
                                ? `${profile.skills.length} skills added`
                                : 'No skills added yet'}
                        </p>

                    </div>

                    <Link
                        to="/profile"
                        className="applications-button"
                    >
                        Edit Profile
                    </Link>
                </section>

                {/* Stats */}
                <section className="applications-grid">

                    <article className="application-item">
                        <div className="application-content">
                            <span className="application-company">
                                APPLICATIONS
                            </span>

                            <h2>
                                {summary.total}
                            </h2>

                            <p className="application-applied">
                                Jobs you have applied for
                            </p>
                        </div>
                    </article>

                    <article className="application-item">
                        <div className="application-content">
                            <span className="application-company">
                                PROFILE
                            </span>

                            <h2>
                                {profileCompletion}%
                            </h2>

                            <p className="application-applied">
                                Keep your profile updated
                            </p>
                        </div>
                    </article>

                    <article className="application-item"><div className="application-content"><span className="application-company">IN REVIEW</span><h2>{(summary.byStatus.SUBMITTED ?? 0) + (summary.byStatus.REVIEWING ?? 0)}</h2><p className="application-applied">Applications in review</p></div></article>
                    <article className="application-item"><div className="application-content"><span className="application-company">SAVED JOBS</span><h2>{summary.saved}</h2><p className="application-applied">Roles you bookmarked</p><Link to="/jobs" className="text-link">Browse jobs</Link></div></article>

                </section>

                <section className="dashboard-quick-actions" aria-label="Quick actions"><Link to="/jobs">Explore jobs <span>↗</span></Link><Link to="/profile">Update profile <span>↗</span></Link><Link to="/applications">Track applications <span>↗</span></Link><Link to="/messages">Open messages <span>↗</span></Link></section>

                {/* Recent Applications */}
                <section>
                    <div className="applications-top">
                        <div>
                            <span className="applications-label">
                                RECENT ACTIVITY
                            </span>

                            <h2>Recent Applications</h2>
                        </div>

                        <Link
                            to="/applications"
                            className="applications-button"
                        >
                            View All
                        </Link>
                    </div>

                    {applications.length === 0 ? (
                        <div className="applications-empty">
                            <h2>No applications yet</h2>

                            <p>
                                Start applying for jobs to see them here.
                            </p>

                            <Link
                                to="/jobs"
                                className="applications-button"
                            >
                                Find Jobs
                            </Link>
                        </div>
                    ) : (
                        <div className="applications-grid">
                            {applications
                                .slice(0, 3)
                                .map((application) => (
                                    <article
                                        key={application.id}
                                        className="application-item"
                                    >
                                        <div className="application-content">

                                            <span className="application-company">
                                                {application.job?.company?.name ??
                                                    'Company'}
                                            </span>

                                            <h2>
                                                {application.job?.title ??
                                                    'Job'}
                                            </h2>

                                            <p className="application-location">
                                                {application.job?.location ||
                                                    'Location not specified'}
                                            </p>

                                            <p className="application-applied">
                                                Applied on{' '}
                                                {new Date(
                                                    application.appliedAt
                                                ).toLocaleDateString()}
                                            </p>

                                        </div>

                                        <span className="application-badge">
                                            {application.status}
                                        </span>
                                    </article>
                                ))}
                        </div>
                    )}
                </section>

            </section>
        </main>
    );
}
