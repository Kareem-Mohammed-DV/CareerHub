import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
    getMyProfile,
    updateMyProfile,
    type JobSeekerProfile,
} from '../api/profiles';
import ResumeManager from '../components/ResumeManager';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Profile() {
    usePageTitle('My profile');
    const [profile, setProfile] =
        useState<JobSeekerProfile | null>(null);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [headline, setHeadline] = useState('');
    const [bio, setBio] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState('');
    const [yearsOfExperience, setYearsOfExperience] =
        useState('');
    const [skills, setSkills] = useState('');
    const [experienceText, setExperienceText] = useState('[]');
    const [educationText, setEducationText] = useState('[]');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        async function loadProfile() {
            try {
                setLoading(true);
                setError('');

                const data = await getMyProfile();

                setProfile(data);

                if (data) {
                    setFirstName(data.firstName ?? '');
                    setLastName(data.lastName ?? '');
                    setHeadline(data.headline ?? '');
                    setBio(data.bio ?? '');
                    setPhone(data.phone ?? '');
                    setLocation(data.location ?? '');

                    setYearsOfExperience(
                        data.yearsOfExperience != null
                            ? String(data.yearsOfExperience)
                            : ''
                    );

                    setSkills(
                        data.skills?.join(', ') ?? ''
                    );
                    setExperienceText(JSON.stringify(data.experience ?? [], null, 2));
                    setEducationText(JSON.stringify(data.education ?? [], null, 2));
                }
            } catch (error) {
                setError(
                    error instanceof Error
                        ? error.message
                        : 'Failed to load profile'
                );
            } finally {
                setLoading(false);
            }
        }

        loadProfile();
    }, []);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        try {
            setSaving(true);
            setMessage('');
            setError('');

            const parseEntries = (value: string): unknown[] => {
                if (!value.trim()) return [];
                const parsed: unknown = JSON.parse(value);
                if (!Array.isArray(parsed)) throw new Error('Experience and education must each be a JSON list.');
                return parsed;
            };
            const updatedProfile =
                await updateMyProfile({
                    firstName,
                    lastName,
                    headline,
                    bio,
                    phone,
                    location,
                    yearsOfExperience: yearsOfExperience === '' ? undefined : Number(yearsOfExperience),
                    skills: skills
                        .split(',')
                        .map((skill) => skill.trim())
                        .filter(Boolean),
                    experience: parseEntries(experienceText),
                    education: parseEntries(educationText),
                });

            setProfile(updatedProfile);

            setMessage('Profile updated successfully.');
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : 'Failed to update profile'
            );
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <main className="jobs-page">
                <section className="jobs-container">
                    <div className="applications-loading">
                        <div className="jobs-loader" />

                        <h2>Loading profile...</h2>

                        <p>
                            Please wait while we load your profile.
                        </p>
                    </div>
                </section>
            </main>
        );
    }

    const completionValues = [firstName, lastName, headline, bio, location, skills, yearsOfExperience];
    const completion = Math.round(completionValues.filter((value) => value.trim()).length / completionValues.length * 100);

    return (
        <main className="jobs-page">
            <section className="jobs-container">

                <header className="applications-top">
                    <div>
                        <span className="applications-label">
                            CAREERHUB
                        </span>

                        <h1>My Profile</h1>

                        <p>
                            Build your professional profile.
                        </p>
                    </div>

                    <Link
                        to="/job-seeker/dashboard"
                        className="applications-button"
                    >
                        Dashboard
                    </Link>
                </header>

                <section className="profile-completion" aria-label={`Profile ${completion}% complete`}>
                    <div><p className="eyebrow">PROFILE STRENGTH</p><strong>{completion}%</strong><p>Complete your professional story so employers can find the right fit.</p></div>
                    <div className="completion-track"><span style={{ width: `${completion}%` }} /></div>
                </section>

                <ResumeManager />

                {error && (
                    <div className="applications-empty">
                        <h2>Something went wrong</h2>

                        <p>{error}</p>
                    </div>
                )}

                {message && (
                    <div className="applications-empty">
                        <h2>Success</h2>

                        <p>{message}</p>
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="profile-form"
                >
                    <div className="profile-form-grid">

                        <label>
                            First Name

                            <input
                                type="text"
                                value={firstName}
                                onChange={(event) =>
                                    setFirstName(
                                        event.target.value
                                    )
                                }
                                placeholder="Kareem"
                                required
                            />
                        </label>

                        <label>
                            Last Name

                            <input
                                type="text"
                                value={lastName}
                                onChange={(event) =>
                                    setLastName(
                                        event.target.value
                                    )
                                }
                                placeholder="Mohamed"
                                required
                            />
                        </label>

                        <label>
                            Headline

                            <input
                                type="text"
                                value={headline}
                                onChange={(event) =>
                                    setHeadline(
                                        event.target.value
                                    )
                                }
                                placeholder="Frontend Developer"
                            />
                        </label>

                        <label>
                            Phone

                            <input
                                type="tel"
                                value={phone}
                                onChange={(event) =>
                                    setPhone(
                                        event.target.value
                                    )
                                }
                                placeholder="+20..."
                            />
                        </label>

                        <label>
                            Location

                            <input
                                type="text"
                                value={location}
                                onChange={(event) =>
                                    setLocation(
                                        event.target.value
                                    )
                                }
                                placeholder="Cairo, Egypt"
                            />
                        </label>

                        <label>
                            Years of Experience

                            <input
                                type="number"
                                min="0"
                                value={yearsOfExperience}
                                onChange={(event) =>
                                    setYearsOfExperience(
                                        event.target.value
                                    )
                                }
                                placeholder="0"
                            />
                        </label>

                    </div>

                    <label>
                        Skills

                        <input
                            type="text"
                            value={skills}
                            onChange={(event) =>
                                setSkills(
                                    event.target.value
                                )
                            }
                            placeholder="JavaScript, React, HTML, CSS"
                        />

                        <small>
                            Separate skills with commas.
                        </small>
                    </label>

                    <details className="profile-structured-data">
                        <summary>Experience and education history</summary>
                        <p>Enter each section as a JSON list of entries. Keep the empty list if you have no entries yet.</p>
                        <label>Experience entries<textarea rows={6} spellCheck={false} value={experienceText} onChange={(event) => setExperienceText(event.target.value)} /></label>
                        <label>Education entries<textarea rows={6} spellCheck={false} value={educationText} onChange={(event) => setEducationText(event.target.value)} /></label>
                    </details>

                    <label>
                        Bio

                        <textarea
                            value={bio}
                            onChange={(event) =>
                                setBio(
                                    event.target.value
                                )
                            }
                            placeholder="Tell employers about yourself..."
                            rows={6}
                        />
                    </label>

                    <div className="profile-actions">

                        <button
                            type="submit"
                            className="applications-button"
                            disabled={saving}
                        >
                            {saving
                                ? 'Saving...'
                                : 'Save Profile'}
                        </button>

                        <Link
                            to="/job-seeker/dashboard"
                            className="applications-button"
                        >
                            Cancel
                        </Link>

                    </div>
                </form>

                {profile && (
                    <p className="application-applied">
                        Your profile is connected to your CareerHub
                        account.
                    </p>
                )}

            </section>
        </main>
    );
}
