import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

type Resume = {
  id: string; fileName: string; mimeType: string; sizeBytes: number;
  isDefault: boolean; createdAt: string;
};

const MAX_BYTES = 5_000_000;
const ACCEPTED = '.pdf,.doc,.docx';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResumeManager() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try { setResumes(await api<Resume[]>('/resumes')); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Failed to load resumes.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function upload(file: File) {
    setBusy(true); setError(''); setMessage('');
    try {
      if (file.size > MAX_BYTES) throw new Error('File is too large — the limit is 5 MB.');
      const buffer = await file.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
      await api('/resumes', {
        method: 'POST',
        body: JSON.stringify({ fileName: file.name, mimeType: file.type || 'application/pdf', sizeBytes: file.size, dataBase64: btoa(binary), isDefault: true }),
      });
      setMessage('CV uploaded and set as your default.');
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Upload failed.'); }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = ''; }
  }

  async function makeDefault(id: string) {
    setBusy(true);
    try { await api(`/resumes/${id}/default`, { method: 'PATCH' }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not set default.'); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    setBusy(true);
    try { await api(`/resumes/${id}`, { method: 'DELETE' }); await load(); setMessage('CV deleted.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete.'); }
    finally { setBusy(false); }
  }

  const downloadUrl = (id: string) => `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1'}/resumes/${id}/download`;

  return (
    <section className="resume-manager" aria-label="CV manager">
      <div className="resume-head">
        <div><p className="eyebrow">YOUR CV</p><h2>Resume</h2></div>
        <label className="applications-button resume-upload-label">
          {busy ? 'Working…' : 'Upload CV'}
          <input ref={fileInput} type="file" accept={ACCEPTED} hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
        </label>
      </div>
      <p className="application-applied">PDF, DOC or DOCX · up to 5 MB. Your default CV is sent with new applications.</p>
      {error && <p className="message error" role="alert">{error}</p>}
      {message && <p className="message" role="status">{message}</p>}
      {loading ? <div className="jobs-loader" />
        : resumes.length === 0 ? <p className="application-applied">No CV uploaded yet — upload one to strengthen your applications.</p>
          : <ul className="resume-list">
            {resumes.map((resume) => (
              <li key={resume.id} className="resume-row">
                <div>
                  <strong>{resume.fileName}</strong>
                  <small>{formatSize(resume.sizeBytes)} · {new Date(resume.createdAt).toLocaleDateString()} {resume.isDefault && <span className="resume-default-badge">DEFAULT</span>}</small>
                </div>
                <div className="application-card-actions">
                  {!resume.isDefault && <button className="secondary-button" type="button" disabled={busy} onClick={() => makeDefault(resume.id)}>Make default</button>}
                  <a className="secondary-button" href={downloadUrl(resume.id)} download>Download</a>
                  <button className="secondary-button" type="button" disabled={busy} onClick={() => remove(resume.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>}
    </section>
  );
}
