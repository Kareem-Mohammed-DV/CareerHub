const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';
export type Role = 'JOB_SEEKER' | 'COMPANY';
export async function register(email: string, password: string, role: Role) {
  const response = await fetch(`${API_URL}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ email, password, role }) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? 'Registration failed');
  return body.data;
}
export async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ email, password }) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? 'Login failed');
  return body.data;
}

