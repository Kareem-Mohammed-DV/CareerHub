import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import { usePageTitle } from '../hooks/usePageTitle';

type JobAlert = {
  id: string; keyword: string | null; location: string | null; category: string | null;
  experienceLevel: string | null; employmentType: string | null; workplaceType: string | null;
  frequency: 'INSTANT' | 'DAILY' | 'WEEKLY'; active: boolean; createdAt: string;
};

const experienceOptions = ['', 'ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE'];
const employmentOptions = ['', 'FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE'];
const workplaceOptions = ['', 'ONSITE', 'HYBRID', 'REMOTE'];
const frequencyOptions = ['DAILY', 'INSTANT', 'WEEKLY'];

export default function JobAlerts() {
  usePageTitle('Job alerts');
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({ keyword: '', location: '', category: '', experienceLevel: '', employmentType: '', workplaceType: '', frequency: 'DAILY' });

  async function load() {
    setLoading(true); setError('');
    try { setAlerts(await api<JobAlert[]>('/job-alerts')); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Failed to load alerts.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''));
      await api('/job-alerts', { method: 'POST', body: JSON.stringify(payload) });
      setMessage('Alert created — we will notify you when matching jobs are published.');
      setForm({ keyword: '', location: '', category: '', experienceLevel: '', employmentType: '', workplaceType: '', frequency: 'DAILY' });
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create the alert.'); }
    finally { setSaving(false); }
  }

  async function toggle(alert: JobAlert) {
    try { await api(`/job-alerts/${alert.id}`, { method: 'PATCH', body: JSON.stringify({ active: !alert.active }) }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update the alert.'); }
  }

  async function remove(id: string) {
    try { await api(`/job-alerts/${id}`, { method: 'DELETE' }); setAlerts((current) => current.filter((alert) => alert.id !== id)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete the alert.'); }
  }

  const describe = (alert: JobAlert) => [alert.keyword, alert.category, alert.location, alert.experienceLevel, alert.employmentType, alert.workplaceType].filter(Boolean).join(' · ') || 'Any new job';

  return (
    <main className="jobs-page"><section className="jobs-container">
      <header className="applications-top"><div>
        <span className="applications-label">CAREERHUB · AUTOMATION</span>
        <h1>Job alerts</h1>
        <p>Tell us what you are looking for — we watch the network for you.</p>
      </div></header>
      {error && <p className="message error" role="alert">{error}</p>}
      {message && <p className="message" role="status">{message}</p>}

      <form className="jobs-filters alert-form" onSubmit={submit}>
        <div className="jobs-filter-grid">
          <label><span>KEYWORD</span><input value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} placeholder="e.g. frontend" /></label>
          <label><span>CATEGORY</span><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Development" /></label>
          <label><span>LOCATION</span><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Cairo" /></label>
          <label><span>EXPERIENCE</span><select value={form.experienceLevel} onChange={(e) => setForm({ ...form, experienceLevel: e.target.value })}>{experienceOptions.map((option) => <option key={option} value={option}>{option || 'Any level'}</option>)}</select></label>
          <label><span>EMPLOYMENT</span><select value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>{employmentOptions.map((option) => <option key={option} value={option}>{option || 'Any type'}</option>)}</select></label>
          <label><span>WORKPLACE</span><select value={form.workplaceType} onChange={(e) => setForm({ ...form, workplaceType: e.target.value })}>{workplaceOptions.map((option) => <option key={option} value={option}>{option || 'Any'}</option>)}</select></label>
        </div>
        <div className="jobs-filter-actions">
          <label className="alert-frequency"><span>NOTIFY ME</span><select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>{frequencyOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <button className="applications-button" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create alert'}</button>
        </div>
      </form>

      {loading ? <div className="applications-loading"><div className="jobs-loader" /><h2>Loading alerts…</h2></div>
        : alerts.length === 0 ? <div className="applications-empty"><h2>No alerts yet</h2><p>Create your first alert above and let the opportunities come to you.</p></div>
          : <div className="applications-grid">{alerts.map((alert) => (
            <article key={alert.id} className={`application-item${alert.active ? '' : ' alert-inactive'}`}>
              <div className="application-content">
                <span className="application-company">{alert.frequency} · {alert.active ? 'ACTIVE' : 'PAUSED'}</span>
                <h2>{describe(alert)}</h2>
                <p className="application-applied">Created {new Date(alert.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="application-card-actions">
                <button className="secondary-button" type="button" onClick={() => toggle(alert)}>{alert.active ? 'Pause' : 'Resume'}</button>
                <button className="secondary-button" type="button" onClick={() => remove(alert.id)}>Delete</button>
              </div>
            </article>
          ))}</div>}
    </section></main>
  );
}
