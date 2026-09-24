import { FormEvent, useEffect, useState } from 'react';
import {
    createCompany,
    getMyCompany,
    updateMyCompany,
    type Company,
} from '../api/companies';
import { createJob, type CreateJobInput } from '../api/jobs';
import { getMyCompanyJobs, type ManagedJob } from '../api/jobs';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

export default function CompanyDashboard() {    usePageTitle("Company dashboard");

    // ================================
    // COMPANY
    // ================================

    const [company, setCompany] = useState<Company | null>(null);
    const [companyJobs, setCompanyJobs] = useState<ManagedJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingCompany, setSavingCompany] = useState(false);
    const [companyMessage, setCompanyMessage] = useState('');
    const [companyError, setCompanyError] = useState('');

    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [website, setWebsite] = useState('');
    const [industry, setIndustry] = useState('');
    const [size, setSize] = useState('');
    const [location, setLocation] = useState('');
    const [logoUrl, setLogoUrl] = useState('');

    // ================================
    // JOB
    // ================================

    const [savingJob, setSavingJob] = useState(false);
    const [jobMessage, setJobMessage] = useState('');
    const [jobError, setJobError] = useState('');

    const [jobTitle, setJobTitle] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [jobRequirements, setJobRequirements] = useState('');
    const [jobCategory, setJobCategory] = useState('');
    const [jobLocation, setJobLocation] = useState('');
    const [employmentType, setEmploymentType] =
        useState<CreateJobInput['employmentType']>('FULL_TIME');
    const [workplaceType, setWorkplaceType] =
        useState<CreateJobInput['workplaceType']>('REMOTE');
    const [experienceLevel, setExperienceLevel] =
        useState<CreateJobInput['experienceLevel']>('ENTRY');
    const [salaryMin, setSalaryMin] = useState('');
    const [salaryMax, setSalaryMax] = useState('');
    const [currency, setCurrency] = useState('EGP');

    // ================================
    // LOAD COMPANY
    // ================================

    useEffect(() => {
        async function loadCompany() {
            try {
                setLoading(true);
                setCompanyError('');

                const data = await getMyCompany();

                setCompany(data);

                if (data) setCompanyJobs(await getMyCompanyJobs());

                if (data) {
                    setName(data.name);
                    setSlug(data.slug);
                    setDescription(data.description ?? '');
                    setWebsite(data.website ?? '');
                    setIndustry(data.industry ?? '');
                    setSize(data.size ?? '');
                    setLocation(data.location ?? '');
                    setLogoUrl(data.logoUrl ?? '');
                }
            } catch (error) {
                setCompanyError(
                    error instanceof Error
                        ? error.message
                        : 'Failed to load company'
                );
            } finally {
                setLoading(false);
            }
        }

        loadCompany();
    }, []);

    // ================================
    // SAVE COMPANY
    // ================================

    async function submitCompany(event: FormEvent) {
        event.preventDefault();

        try {
            setSavingCompany(true);
            setCompanyMessage('');
            setCompanyError('');

            if (!name.trim() || !slug.trim()) {
                setCompanyError('Company name and slug are required.');
                return;
            }

            const payload = {
                name: name.trim(),
                slug: slug.trim(),
                description: description.trim() || undefined,
                website: website.trim() || undefined,
                industry: industry.trim() || undefined,
                size: size.trim() || undefined,
                location: location.trim() || undefined,
                logoUrl: logoUrl.trim() || undefined,
            };

            let savedCompany: Company;

            if (company) {
                savedCompany = await updateMyCompany(payload);
            } else {
                savedCompany = await createCompany(payload);
            }

            setCompany(savedCompany);

            setCompanyMessage(
                company
                    ? 'Company profile updated successfully.'
                    : 'Company profile created successfully.'
            );
        } catch (error) {
            setCompanyError(
                error instanceof Error
                    ? error.message
                    : 'Failed to save company'
            );
        } finally {
            setSavingCompany(false);
        }
    }

    // ================================
    // CREATE JOB
    // ================================

    async function submitJob(event: FormEvent) {
        event.preventDefault();

        try {
            setSavingJob(true);
            setJobMessage('');
            setJobError('');

            if (
                !jobTitle.trim() ||
                !jobDescription.trim() ||
                !jobCategory.trim()
            ) {
                setJobError(
                    'Job title, description, and category are required.'
                );
                return;
            }

            if (jobDescription.trim().length < 30) {
                setJobError(
                    'Job description must be at least 30 characters.'
                );
                return;
            }

            const minSalary = salaryMin
                ? Number(salaryMin)
                : undefined;

            const maxSalary = salaryMax
                ? Number(salaryMax)
                : undefined;

            if (
                minSalary !== undefined &&
                maxSalary !== undefined &&
                minSalary > maxSalary
            ) {
                setJobError(
                    'Minimum salary cannot be greater than maximum salary.'
                );
                return;
            }

            const payload: CreateJobInput = {
                title: jobTitle.trim(),
                description: jobDescription.trim(),
                requirements: jobRequirements.trim() || undefined,
                category: jobCategory.trim(),
                location: jobLocation.trim() || undefined,
                employmentType,
                workplaceType,
                experienceLevel,
                salaryMin: minSalary,
                salaryMax: maxSalary,
                currency,
                status: 'PUBLISHED',
            };

            await createJob(payload);
            setCompanyJobs(await getMyCompanyJobs());

            setJobMessage(
                'Job published successfully. Candidates can now see it.'
            );

            // Reset job form
            setJobTitle('');
            setJobDescription('');
            setJobRequirements('');
            setJobCategory('');
            setJobLocation('');
            setEmploymentType('FULL_TIME');
            setWorkplaceType('REMOTE');
            setExperienceLevel('ENTRY');
            setSalaryMin('');
            setSalaryMax('');
            setCurrency('EGP');
        } catch (error) {
            setJobError(
                error instanceof Error
                    ? error.message
                    : 'Failed to create job'
            );
        } finally {
            setSavingJob(false);
        }
    }

    // ================================
    // LOADING
    // ================================

    if (loading) {
        return (
            <main className="dashboard-page">
                <section className="dashboard-container">
                    <div className="dashboard-state">
                        <div className="jobs-loader" />
                        <h2>Loading company dashboard...</h2>
                        <p>
                            Please wait while we load your company profile.
                        </p>
                    </div>
                </section>
            </main>
        );
    }

    // ================================
    // PAGE
    // ================================

    return (
        <main className="dashboard-page">
            <section className="dashboard-container">

                {/* HEADER */}
                <div className="dashboard-header">
                    <div>
                        <p className="eyebrow">COMPANY DASHBOARD</p>

                        <h1>
                            {company
                                ? 'Manage your company.'
                                : 'Create your company.'}
                        </h1>

                        <p>
                            Build your company profile and publish jobs
                            for candidates.
                        </p>
                    </div>
                    {company && <Link to="/company/jobs/new" className="applications-button">Create job</Link>}
                </div>

                {company && <>
                    <div className="company-stat-grid">
                        <article><p className="eyebrow">ACTIVE JOBS</p><strong>{companyJobs.filter((job) => job.status === 'PUBLISHED').length}</strong></article>
                        <article><p className="eyebrow">APPLICATIONS</p><strong>{companyJobs.reduce((total, job) => total + job._count.applications, 0)}</strong></article>
                        <article><p className="eyebrow">SHORTLISTED</p><strong>{companyJobs.reduce((total, job) => total + (job._pipeline.SHORTLISTED ?? 0), 0)}</strong></article>
                        <article><p className="eyebrow">INTERVIEWS</p><strong>{companyJobs.reduce((total, job) => total + (job._pipeline.INTERVIEW ?? 0), 0)}</strong></article>
                    </div>
                    <section className="company-jobs-panel">
                        <div className="section-heading"><div><p className="eyebrow">HIRING WORKSPACE</p><h2>Your open roles</h2></div><Link to="/company/jobs/new" className="secondary-button">Post a role</Link></div>
                        {companyJobs.length === 0 ? <p className="empty-note">Your published jobs will appear here.</p> : <div className="company-openings">{companyJobs.map((job) => <article className="company-opening" key={job.id}><div><h3>{job.title}</h3><p>{job.location ?? 'Flexible location'} · {job._count.applications} applications · {job.status}</p></div><div className="opening-actions"><Link to={`/jobs/${job.id}/applicants`} className="secondary-button">Applicants</Link><Link to={`/company/jobs/${job.id}/edit`} className="secondary-button">Edit</Link></div></article>)}</div>}
                    </section>
                </>}

                {/* COMPANY MESSAGE */}
                {companyError && (
                    <div className="dashboard-message dashboard-error">
                        {companyError}
                    </div>
                )}

                {companyMessage && (
                    <div className="dashboard-message dashboard-success">
                        {companyMessage}
                    </div>
                )}

                {/* ================================
            COMPANY PROFILE
        ================================= */}

                <section className="dashboard-card">
                    <div className="dashboard-card-header">
                        <div>
                            <p className="eyebrow">COMPANY PROFILE</p>
                            <h2>Company Information</h2>
                        </div>
                    </div>

                    <form
                        className="dashboard-form"
                        onSubmit={submitCompany}
                    >
                        <div className="dashboard-form-grid">

                            <label>
                                <span>Company Name *</span>

                                <input
                                    required
                                    type="text"
                                    value={name}
                                    onChange={(event) =>
                                        setName(event.target.value)
                                    }
                                    placeholder="e.g. CareerHub Technologies"
                                />
                            </label>

                            <label>
                                <span>Company Slug *</span>

                                <input
                                    required
                                    type="text"
                                    value={slug}
                                    onChange={(event) =>
                                        setSlug(
                                            event.target.value
                                                .toLowerCase()
                                                .replace(/[^a-z0-9-]/g, '-')
                                        )
                                    }
                                    placeholder="careerhub-technologies"
                                />
                            </label>

                            <label>
                                <span>Industry</span>

                                <input
                                    type="text"
                                    value={industry}
                                    onChange={(event) =>
                                        setIndustry(event.target.value)
                                    }
                                    placeholder="e.g. Software"
                                />
                            </label>

                            <label>
                                <span>Company Size</span>

                                <input
                                    type="text"
                                    value={size}
                                    onChange={(event) =>
                                        setSize(event.target.value)
                                    }
                                    placeholder="e.g. 11-50 employees"
                                />
                            </label>

                            <label>
                                <span>Location</span>

                                <input
                                    type="text"
                                    value={location}
                                    onChange={(event) =>
                                        setLocation(event.target.value)
                                    }
                                    placeholder="e.g. Cairo, Egypt"
                                />
                            </label>

                            <label>
                                <span>Website</span>

                                <input
                                    type="url"
                                    value={website}
                                    onChange={(event) =>
                                        setWebsite(event.target.value)
                                    }
                                    placeholder="https://example.com"
                                />
                            </label>
                        </div>

                        <label>
                            <span>Logo URL</span>

                            <input
                                type="url"
                                value={logoUrl}
                                onChange={(event) =>
                                    setLogoUrl(event.target.value)
                                }
                                placeholder="https://example.com/logo.png"
                            />
                        </label>

                        <label>
                            <span>Description</span>

                            <textarea
                                rows={7}
                                value={description}
                                onChange={(event) =>
                                    setDescription(event.target.value)
                                }
                                placeholder="Tell candidates about your company..."
                            />
                        </label>

                        <div className="dashboard-form-actions">
                            <button
                                className="submit"
                                type="submit"
                                disabled={savingCompany}
                            >
                                {savingCompany
                                    ? 'Saving...'
                                    : company
                                        ? 'Save Changes'
                                        : 'Create Company'}
                            </button>
                        </div>
                    </form>
                </section>

                {/* ================================
            CREATE JOB
        ================================= */}

                <section className="dashboard-card dashboard-job-card">

                    <div className="dashboard-card-header">
                        <div>
                            <p className="eyebrow">JOB MANAGEMENT</p>

                            <h2>Create a Job</h2>

                            <p className="dashboard-section-description">
                                Publish a new opportunity and make it
                                visible to job seekers.
                            </p>
                        </div>
                    </div>

                    {jobError && (
                        <div className="dashboard-message dashboard-error">
                            {jobError}
                        </div>
                    )}

                    {jobMessage && (
                        <div className="dashboard-message dashboard-success">
                            {jobMessage}
                        </div>
                    )}

                    <form
                        className="dashboard-form"
                        onSubmit={submitJob}
                    >
                        {/* TITLE */}

                        <label>
                            <span>Job Title *</span>

                            <input
                                required
                                type="text"
                                value={jobTitle}
                                onChange={(event) =>
                                    setJobTitle(event.target.value)
                                }
                                placeholder="e.g. Frontend Developer"
                            />
                        </label>

                        {/* CATEGORY + LOCATION */}

                        <div className="dashboard-form-grid">

                            <label>
                                <span>Category *</span>

                                <input
                                    required
                                    type="text"
                                    value={jobCategory}
                                    onChange={(event) =>
                                        setJobCategory(event.target.value)
                                    }
                                    placeholder="e.g. Software Development"
                                />
                            </label>

                            <label>
                                <span>Location</span>

                                <input
                                    type="text"
                                    value={jobLocation}
                                    onChange={(event) =>
                                        setJobLocation(event.target.value)
                                    }
                                    placeholder="e.g. Cairo, Egypt"
                                />
                            </label>

                        </div>

                        {/* DESCRIPTION */}

                        <label>
                            <span>Job Description *</span>

                            <textarea
                                required
                                rows={8}
                                value={jobDescription}
                                onChange={(event) =>
                                    setJobDescription(event.target.value)
                                }
                                placeholder="Describe the role, responsibilities, and what the candidate will do..."
                            />
                        </label>

                        {/* REQUIREMENTS */}

                        <label>
                            <span>Requirements</span>

                            <textarea
                                rows={7}
                                value={jobRequirements}
                                onChange={(event) =>
                                    setJobRequirements(event.target.value)
                                }
                                placeholder="e.g. HTML, CSS, JavaScript, React..."
                            />
                        </label>

                        {/* JOB OPTIONS */}

                        <div className="dashboard-form-grid">

                            <label>
                                <span>Employment Type *</span>

                                <select
                                    value={employmentType}
                                    onChange={(event) =>
                                        setEmploymentType(
                                            event.target.value as CreateJobInput['employmentType']
                                        )
                                    }
                                >
                                    <option value="FULL_TIME">
                                        Full Time
                                    </option>

                                    <option value="PART_TIME">
                                        Part Time
                                    </option>

                                    <option value="CONTRACT">
                                        Contract
                                    </option>

                                    <option value="INTERNSHIP">
                                        Internship
                                    </option>

                                    <option value="FREELANCE">
                                        Freelance
                                    </option>
                                </select>
                            </label>

                            <label>
                                <span>Workplace Type *</span>

                                <select
                                    value={workplaceType}
                                    onChange={(event) =>
                                        setWorkplaceType(
                                            event.target.value as CreateJobInput['workplaceType']
                                        )
                                    }
                                >
                                    <option value="REMOTE">
                                        Remote
                                    </option>

                                    <option value="HYBRID">
                                        Hybrid
                                    </option>

                                    <option value="ONSITE">
                                        On-site
                                    </option>
                                </select>
                            </label>

                            <label>
                                <span>Experience Level *</span>

                                <select
                                    value={experienceLevel}
                                    onChange={(event) =>
                                        setExperienceLevel(
                                            event.target.value as CreateJobInput['experienceLevel']
                                        )
                                    }
                                >
                                    <option value="ENTRY">
                                        Entry Level
                                    </option>

                                    <option value="JUNIOR">
                                        Junior
                                    </option>

                                    <option value="MID">
                                        Mid Level
                                    </option>

                                    <option value="SENIOR">
                                        Senior
                                    </option>

                                    <option value="LEAD">
                                        Lead
                                    </option>

                                    <option value="EXECUTIVE">
                                        Executive
                                    </option>
                                </select>
                            </label>

                            <label>
                                <span>Currency</span>

                                <select
                                    value={currency}
                                    onChange={(event) =>
                                        setCurrency(event.target.value)
                                    }
                                >
                                    <option value="EGP">EGP</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                </select>
                            </label>

                        </div>

                        {/* SALARY */}

                        <div className="dashboard-form-grid">

                            <label>
                                <span>Minimum Salary</span>

                                <input
                                    type="number"
                                    min="0"
                                    value={salaryMin}
                                    onChange={(event) =>
                                        setSalaryMin(event.target.value)
                                    }
                                    placeholder="e.g. 10000"
                                />
                            </label>

                            <label>
                                <span>Maximum Salary</span>

                                <input
                                    type="number"
                                    min="0"
                                    value={salaryMax}
                                    onChange={(event) =>
                                        setSalaryMax(event.target.value)
                                    }
                                    placeholder="e.g. 18000"
                                />
                            </label>

                        </div>

                        {/* PUBLISH */}

                        <div className="dashboard-form-actions">

                            <button
                                className="submit"
                                type="submit"
                                disabled={savingJob}
                            >
                                {savingJob
                                    ? 'Publishing...'
                                    : 'Publish Job'}
                            </button>

                        </div>
                    </form>
                </section>

            </section>
        </main>
    );
}
