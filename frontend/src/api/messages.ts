import { api } from './client';

export type Conversation = {
  id: string; companyId: string; jobSeekerId: string; applicationId: string | null;
  updatedAt: string; company: { name: string; logoUrl: string | null };
  jobSeeker?: { id: string; email: string; profile: { firstName: string; lastName: string; headline: string | null } | null };
  messages: Message[];
};
export type Message = { id: string; conversationId: string; senderId: string; body: string; readAt: string | null; createdAt: string };
export const getConversations = () => api<Conversation[]>('/conversations');
export const getMessages = (id: string) => api<Message[]>(`/conversations/${id}/messages`);
export const sendMessage = (id: string, body: string) => api<Message>(`/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ body }) });
