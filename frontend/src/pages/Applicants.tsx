import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { getMyCompany } from '../api/companies';
import { useAuth } from '../auth/AuthContext';

type Applicant = { id: string; userId: string; status: string; appliedAt: string; coverLetter: string | null; job?: { id: string; title: string }; user: { id: string; email: string; profile: { firstName: string; lastName: string; headline: string | null; location: string | null; skills: string[] | null } | null }; history: { id: string; status: string; note: string | null; createdAt: string }[] };
type CandidateProfile = { firstName: string; lastName: string; headline: string | null; bio: string | null; phone: string | null; location: string | null; yearsOfExperience: number; skills: string[]; experience: unknown[]; education: unknown[] };
const statuses = ['REVIEWING','SHORTLISTED','INTERVIEW','OFFER','REJECTED','HIRED'] as const;

export default function Applicants() {
  const { id = '' } = useParams(); const { user } = useAuth();
  const [items, setItems] = useState<Applicant[]>([]); const [companyId, setCompanyId] = useState('');
  const [profile, setProfile] = useState<{ id: string; data: CandidateProfile } | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([api<Applicant[]>(id ? `/jobs/${id}/applications` : '/companies/me/applications'), user?.role === 'COMPANY' ? getMyCompany() : Promise.resolve(null)])
      .then(([data, company]) => { setItems(data); if (company) setCompanyId(company.id); })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not load applicants.'))
      .finally(() => setLoading(false));
  }, [id, user?.role]);

  async function changeStatus(item: Applicant, status: typeof statuses[number]) {
    setBusy(item.id); setError('');
    try { const updated = await api<Applicant>(`/applications/${item.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: updated.status } : entry)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update the application.'); }
    finally { setBusy(null); }
  }

  async function contact(item: Applicant) {
    setBusy(item.id); setError('');
    try { await api('/conversations', { method: 'POST', body: JSON.stringify({ companyId, jobSeekerId: item.userId, applicationId: item.id, body: 'Hello, we would like to discuss your application.' }) }); window.location.assign('/messages'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not start a conversation.'); }
    finally { setBusy(null); }
  }
  async function viewProfile(item: Applicant) {
    setBusy(item.id); setError('');
    try { const data = await api<CandidateProfile>(`/profile/applicant/${item.userId}`); setProfile({ id: item.id, data }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load candidate profile.'); }
    finally { setBusy(null); }
  }

  return <main className="jobs-page"><section className="jobs-container"><header className="applications-top"><div><span className="applications-label">CANDIDATE PIPELINE</span><h1>Applicants</h1><p>Review applications and move candidates through your hiring process.</p></div><Link to={user?.role==='COMPANY'?'/company/jobs':'/admin'} className="applications-button">Back to jobs</Link></header>
    {error && <p className="message error" role="alert">{error}</p>}
    {loading ? <div className="jobs-state"><div className="jobs-loader"/><h2>Loading applicants…</h2></div> : items.length === 0 ? <div className="jobs-state"><h2>No applications yet</h2><p>New candidates will show up here when they apply.</p></div> : <div className="applicant-list">{items.map((item) => { const name = `${item.user.profile?.firstName ?? ''} ${item.user.profile?.lastName ?? ''}`.trim() || item.user.email; return <article className="applicant-card" key={item.id}>
      <div className="applicant-main"><span className="conversation-avatar">{name[0]?.toUpperCase()}</span><div><p className="eyebrow">APPLIED {new Date(item.appliedAt).toLocaleDateString()}</p><h2>{name}</h2><p>{item.user.profile?.headline ?? 'CareerHub member'} · {item.user.profile?.location ?? 'Location not listed'}</p><div className="skill-list">{item.user.profile?.skills?.map((skill) => <span key={skill}>{skill}</span>)}</div>{item.job&&<p className="applicant-job">For: {item.job.title}</p>}</div></div>
      {item.coverLetter && <p className="applicant-letter">{item.coverLetter}</p>}
      <div className="applicant-actions"><span className="application-badge">{item.status}</span><label>Status<select aria-label={`Update status for ${name}`} value={item.status} disabled={busy === item.id} onChange={(event) => changeStatus(item, event.target.value as typeof statuses[number])}><option value={item.status}>{item.status}</option>{statuses.filter((status) => status !== item.status).map((status) => <option key={status} value={status}>{status}</option>)}</select></label><button className="secondary-button" type="button" disabled={busy === item.id} onClick={() => viewProfile(item)}>View profile</button>{user?.role === 'COMPANY' && companyId && <button className="secondary-button" type="button" disabled={busy === item.id} onClick={() => contact(item)}>Message</button>}</div>
      {profile?.id===item.id&&<section className="candidate-profile"><button className="profile-close" type="button" onClick={()=>setProfile(null)} aria-label="Close candidate profile">×</button><p className="eyebrow">CANDIDATE PROFILE</p><h3>{profile.data.firstName} {profile.data.lastName}</h3><p>{profile.data.headline}</p><p>{profile.data.location} · {profile.data.yearsOfExperience} years of experience</p>{profile.data.bio&&<p>{profile.data.bio}</p>}<div className="skill-list">{profile.data.skills?.map((skill)=><span key={skill}>{skill}</span>)}</div><h4>Experience</h4><pre>{JSON.stringify(profile.data.experience??[],null,2)}</pre><h4>Education</h4><pre>{JSON.stringify(profile.data.education??[],null,2)}</pre></section>}
    </article>; })}</div>}
  </section></main>;
}
