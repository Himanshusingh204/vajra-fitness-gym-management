import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import {
  HelpCircle, ChevronDown, Send, CheckCircle, Mail, Phone, Clock,
  MessageSquare, Ticket, Loader2, LifeBuoy,
} from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { Reveal } from '../components/Reveal';
import { usePageMeta } from '../hooks/usePageMeta';

type Faq = { id: string; question: string; answer: string };
type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  createdAt: string;
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CLOSED: 'bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-300',
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const HelpCenterPage = () => {
  usePageMeta(
    'Help Center & FAQ',
    'Answers to common questions about Vajra Fitness — memberships, payments, bookings, and account help. Search the FAQ or raise a support ticket.',
    '/help',
  );
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [ticketForm, setTicketForm] = useState({ subject: '', priority: 'MEDIUM', message: '' });
  const [error, setError] = useState('');

  const { data: faqs = [], isLoading: faqsLoading } = useQuery({
    queryKey: ['public-faqs'],
    queryFn: () => api.get('/public/faqs').then((r) => r.data as Faq[]),
  });

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ['my-tickets'],
    enabled: !!user,
    queryFn: () => api.get('/support/my').then((r) => r.data as Ticket[]),
  });

  const createTicket = useMutation({
    mutationFn: (data: typeof ticketForm) => api.post('/support', data),
    onSuccess: () => {
      setTicketForm({ subject: '', priority: 'MEDIUM', message: '' });
      setError('');
      qc.invalidateQueries({ queryKey: ['my-tickets'] });
    },
    onError: () => setError('Failed to submit your ticket. Please try again.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTicket.mutate(ticketForm);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setTicketForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const contactDetails = [
    { icon: Mail, label: 'Email', value: 'support@vajrafitness.in', href: 'mailto:support@vajrafitness.in' },
    { icon: Phone, label: 'Phone', value: '+91 98765 43210', href: 'tel:+919876543210' },
    { icon: Clock, label: 'Working Hours', value: 'Mon–Sat: 9 AM – 7 PM IST' },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-base)] dark:bg-[var(--color-base)] overflow-x-hidden">
      <div className="relative pt-32 pb-20 md:pt-40 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 -left-24 w-80 h-80 bg-[var(--color-accent)]/10 rounded-full blur-3xl animate-blob [animation-delay:-7s]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Reveal>
              <span className="eyebrow">Help Center</span>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="display mt-5 text-5xl md:text-7xl leading-[0.95]">
                How Can We <span className="text-gradient">Help?</span>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="section-lead max-w-xl mx-auto">
                Browse common questions or raise a support ticket — we typically respond within 24 hours.
              </p>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
            {/* FAQ list */}
            <div className="lg:col-span-3">
              <Reveal>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-extrabold text-[var(--color-deepgray)] dark:text-white">
                    Frequently Asked Questions
                  </h2>
                </div>
              </Reveal>

              <div className="space-y-3">
                {faqsLoading && (
                  <div className="space-y-3">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="glass-strong rounded-2xl h-16 animate-pulse" />
                    ))}
                  </div>
                )}

                {!faqsLoading && faqs.length === 0 && (
                  <div className="glass-strong rounded-2xl p-8 text-center text-[var(--color-muted)]">
                    No FAQs published yet. Contact us directly for assistance.
                  </div>
                )}

                {faqs.map((faq, i) => {
                  const isOpen = openFaq === faq.id;
                  return (
                    <Reveal key={faq.id} delay={i * 60}>
                      <div className={`glass-strong rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? 'ring-2 ring-[var(--color-primary)]/30' : ''}`}>
                        <button
                          onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                          className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-[var(--color-primary)]/5 transition-colors"
                          aria-expanded={isOpen}
                        >
                          <span className="font-semibold text-[var(--color-charcoal)] dark:text-white">{faq.question}</span>
                          <ChevronDown className={`w-5 h-5 shrink-0 text-[var(--color-primary)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <div className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                          <div className="overflow-hidden">
                            <p className="px-5 pb-5 text-sm text-[var(--color-muted)] leading-relaxed">{faq.answer}</p>
                          </div>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>

            {/* Support form + tickets */}
            <div className="lg:col-span-2 space-y-6">
              <Reveal variant="right">
                <div className="glass-strong rounded-3xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                      <LifeBuoy className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-extrabold text-[var(--color-deepgray)] dark:text-white">
                      Raise a Ticket
                    </h2>
                  </div>

                  {!user ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-[var(--color-muted)] mx-auto mb-4" />
                      <p className="text-sm text-[var(--color-muted)] mb-4">
                        Log in to raise a support ticket and track its status.
                      </p>
                      <Link to="/login" className="btn-primary w-full py-2.5 text-sm">Login to Continue</Link>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-xl p-3 text-sm font-medium">
                          {error}
                        </div>
                      )}

                      <div>
                        <label htmlFor="subject" className="block text-sm font-semibold text-[var(--color-charcoal)] mb-1.5">Subject</label>
                        <select id="subject" name="subject" required className="input-field" value={ticketForm.subject} onChange={handleChange}>
                          <option value="">Select a topic…</option>
                          <option value="Membership">Membership Help</option>
                          <option value="Billing / Payments">Billing or Payment</option>
                          <option value="Gym Account">Gym Owner Account</option>
                          <option value="Technical Issue">Technical Support</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="priority" className="block text-sm font-semibold text-[var(--color-charcoal)] mb-1.5">Priority</label>
                        <select id="priority" name="priority" className="input-field" value={ticketForm.priority} onChange={handleChange}>
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="URGENT">Urgent</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="message" className="block text-sm font-semibold text-[var(--color-charcoal)] mb-1.5">Describe your issue</label>
                        <textarea
                          id="message"
                          name="message"
                          rows={5}
                          required
                          className="input-field resize-none"
                          placeholder="Tell us what's going wrong…"
                          value={ticketForm.message}
                          onChange={handleChange}
                        />
                      </div>

                      <button type="submit" disabled={createTicket.isPending} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                        {createTicket.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {createTicket.isPending ? 'Submitting…' : 'Submit Ticket'}
                      </button>
                    </form>
                  )}
                </div>
              </Reveal>

              {/* Contact details */}
              <Reveal variant="right" delay={120}>
                <div className="glass-strong rounded-3xl p-6 space-y-4">
                  <h3 className="font-bold text-[var(--color-deepgray)] dark:text-white flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-[var(--color-primary)]" /> Prefer to talk?
                  </h3>
                  {contactDetails.map(({ icon: Icon, label, value, href }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider">{label}</p>
                        {href ? (
                          <a href={href} className="text-sm text-[var(--color-charcoal)] dark:text-white font-medium hover:text-[var(--color-primary)] transition-colors">{value}</a>
                        ) : (
                          <p className="text-sm text-[var(--color-charcoal)] dark:text-white font-medium">{value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>

          {/* My tickets */}
          {user && (
            <div className="mt-16">
              <Reveal>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-extrabold text-[var(--color-deepgray)] dark:text-white">
                    My Support Tickets
                  </h2>
                </div>
              </Reveal>

              <div className="space-y-3">
                {ticketsLoading && (
                  <div className="space-y-3">
                    {[0, 1].map((i) => (
                      <div key={i} className="glass-strong rounded-2xl h-24 animate-pulse" />
                    ))}
                  </div>
                )}

                {!ticketsLoading && tickets.length === 0 && (
                  <div className="glass-strong rounded-2xl p-8 text-center text-[var(--color-muted)]">
                    You haven't raised any tickets yet.
                  </div>
                )}

                {tickets.map((t) => (
                  <div key={t.id} className="glass-strong rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[var(--color-charcoal)] dark:text-white">{t.subject}</h3>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[t.status] || STATUS_STYLES.OPEN}`}>{t.status.replace('_', ' ')}</span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.MEDIUM}`}>{t.priority}</span>
                      </div>
                      <p className="text-sm text-[var(--color-muted)] line-clamp-2">{t.message}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--color-muted)] shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!faqsLoading && faqs.length > 0 && (
            <div className="mt-16 text-center">
              <Reveal>
                <div className="glass-strong rounded-2xl p-6 inline-flex flex-col sm:flex-row items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                  <p className="text-sm text-[var(--color-muted)]">
                    Still stuck? Send an email to{' '}
                    <a href="mailto:support@vajrafitness.in" className="text-[var(--color-primary)] font-semibold hover:underline">support@vajrafitness.in</a>
                  </p>
                </div>
              </Reveal>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpCenterPage;
