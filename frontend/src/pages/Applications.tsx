import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyApplications, type Application } from '../api/applications';
import { api } from '../api/client';
import { usePageTitle } from '../hooks/usePageTitle';

type HistoryItem={id:string;status:string;note:string|null;createdAt:string};
const filters=['ALL','SUBMITTED','REVIEWING','SHORTLISTED','INTERVIEW','OFFER','HIRED','REJECTED','WITHDRAWN'];

export default function Applications() {
    usePageTitle("My applications");
  const [applications,setApplications]=useState<Application[]>([]);const [history,setHistory]=useState<Record<string,HistoryItem[]>>({});const [filter,setFilter]=useState('ALL');const [open,setOpen]=useState<string|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
  useEffect(()=>{getMyApplications(1,100).then((response)=>setApplications(response.data)).catch((reason:unknown)=>setError(reason instanceof Error?reason.message:'Failed to load applications.')).finally(()=>setLoading(false));},[]);
  const visible=useMemo(()=>applications.filter((item)=>filter==='ALL'||item.status===filter),[applications,filter]);
  async function toggleHistory(id:string){if(open===id){setOpen(null);return;}setOpen(id);if(history[id])return;try{const data=await api<HistoryItem[]>(`/applications/${id}/history`);setHistory((current)=>({...current,[id]:data}));}catch(reason){setError(reason instanceof Error?reason.message:'Could not load application history.');}}
  return <main className="applications-page"><div className="applications-wrapper"><header className="applications-top"><div><span className="applications-label">CAREERHUB · YOUR JOURNEY</span><h1>My applications</h1><p>Keep track of every opportunity and what happens next.</p></div><Link to="/jobs" className="applications-button">Find opportunities</Link></header>
    {error&&<p className="message error" role="alert">{error}</p>}
    <nav className="application-filters" aria-label="Filter applications">{filters.map((status)=><button type="button" key={status} aria-pressed={filter===status} className={filter===status?'active':''} onClick={()=>setFilter(status)}>{status==='ALL'?'All':status.replace('_',' ')}</button>)}</nav>
    {loading?<div className="applications-loading"><div className="jobs-loader"/><h2>Loading applications…</h2></div>:visible.length===0?<div className="applications-empty"><h2>{applications.length?'No applications in this stage':'Your next chapter starts here'}</h2><p>{applications.length?'Choose another status to see more applications.':'Explore open roles and start building your journey.'}</p><Link to="/jobs" className="applications-button">Browse jobs</Link></div>:<section className="applications-grid">{visible.map((item)=><article key={item.id} className="application-item"><div className="application-content"><span className="application-company">{item.job.company.name}</span><h2>{item.job.title}</h2><p className="application-location">{item.job.location??'Flexible location'}</p><p className="application-applied">Applied {new Date(item.appliedAt).toLocaleDateString()}</p></div><div className="application-card-actions"><span className={`application-badge status-${item.status.toLowerCase()}`}>{item.status.replace('_',' ')}</span><Link to={`/jobs/${item.job.id}`} className="secondary-button">View job</Link><button className="secondary-button" type="button" aria-expanded={open===item.id} onClick={()=>toggleHistory(item.id)}>{open===item.id?'Hide timeline':'Status timeline'}</button></div>{open===item.id&&<ol className="application-timeline">{(history[item.id]??[]).map((entry)=><li key={entry.id}><span>{entry.status.replace('_',' ')}</span><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleDateString()}</time>{entry.note&&<p>{entry.note}</p>}</li>)}</ol>}</article>)}</section>}
  </div></main>;
}
