import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle, MessageCircle } from 'lucide-react';
import api from '../services/api';
import { Reveal } from '../components/Reveal';
import { usePageMeta } from '../hooks/usePageMeta';

const ContactPage = () => {
  usePageMeta(
    'Contact Us',
    'Get in touch with the Vajra Fitness team. Questions, partnerships, or support — reach us via phone, email, or the contact form.',
    '/contact',
  );
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const wordCount = form.message.trim() ? form.message.trim().split(/\s+/).length : 0;
  const MAX_WORDS = 1000;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Live-block typing beyond the word cap so the counter can never go red.
    if (name === 'message') {
      const words = value.trim() ? value.trim().split(/\s+/).length : 0;
      if (words > MAX_WORDS) return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (form.phone) {
      const phone = form.phone.replace(/[\s-]/g, '');
      if (!/^(\+?91[\s-]?)?([6-9]\d{9})$/.test(phone)) {
        setError('Please enter a valid 10-digit Indian mobile number (starting with 6-9).');
        setLoading(false);
        return;
      }
    }
    if (wordCount > MAX_WORDS) {
      setError(`Message must not exceed ${MAX_WORDS} words.`);
      setLoading(false);
      return;
    }

    try {
      await api.post('/enquiries/contact', form);
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send. Please try again or email us directly.');
    } finally {
      setLoading(false);
    }
  };

  const contactDetails = [
    { icon: MapPin, label: 'Address', value: 'Vajra Fitness HQ, Jodhpur, Rajasthan 342001' },
    { icon: Phone, label: 'Phone', value: '+91 98765 43210', href: 'tel:+919876543210' },
    { icon: Mail, label: 'Email', value: 'support@vajrafitness.in', href: 'mailto:support@vajrafitness.in' },
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
              <span className="eyebrow">Contact</span>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="display mt-5 text-5xl md:text-7xl leading-[0.95]">
                Get In <span className="text-gradient">Touch</span>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="section-lead max-w-xl mx-auto">
                Whether you're a gym owner looking to partner or a member with a query — we're here.
              </p>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            <div className="lg:col-span-2 space-y-5">
              {contactDetails.map(({ icon: Icon, label, value, href }, i) => (
                <Reveal key={label} delay={i * 80}>
                  <div className="card-hover flex gap-4 items-start p-5!">
                    <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-0.5">{label}</p>
                      {href ? (
                        <a href={href} className="text-[var(--color-charcoal)] font-medium hover:text-[var(--color-primary)] transition-colors">
                          {value}
                        </a>
                      ) : (
                        <p className="text-[var(--color-charcoal)] font-medium">{value}</p>
                      )}
                    </div>
                  </div>
                </Reveal>
              ))}

              <Reveal delay={320}>
                <a
                  href="https://wa.me/919876543210"
                  target="_blank"
                  rel="noreferrer"
                  className="card-hover flex items-center gap-4 p-5! group"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-0.5">WhatsApp</p>
                    <p className="text-[var(--color-charcoal)] font-medium group-hover:text-[#25D366] transition-colors">
                      Chat with us instantly
                    </p>
                  </div>
                </a>
              </Reveal>
            </div>

            <Reveal variant="right" className="lg:col-span-3">
              <div className="glass-strong rounded-3xl p-8">
                {sent ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                    <div className="w-20 h-20 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mb-5">
                      <CheckCircle className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-extrabold text-[var(--color-deepgray)] dark:text-white mb-2">Message Sent!</h3>
                    <p className="text-[var(--color-muted)]">We'll get back to you within 24 hours.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <h2 className="text-xl font-extrabold text-[var(--color-deepgray)] dark:text-white mb-6">Send us a message</h2>

                    {error && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-xl p-3 text-sm font-medium">
                        {error}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="name" className="block text-sm font-semibold text-[var(--color-charcoal)] mb-1.5">Full Name</label>
                        <input id="name" name="name" type="text" required className="input-field" placeholder="Ramesh Sharma" value={form.name} onChange={handleChange} />
                      </div>
                      <div>
                        <label htmlFor="phone" className="block text-sm font-semibold text-[var(--color-charcoal)] mb-1.5">Phone</label>
                        <input id="phone" name="phone" type="tel" className="input-field" placeholder="+91 98765 43210" value={form.phone} onChange={handleChange} />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-[var(--color-charcoal)] mb-1.5">Email</label>
                      <input id="email" name="email" type="email" required className="input-field" placeholder="you@example.com" value={form.email} onChange={handleChange} />
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-sm font-semibold text-[var(--color-charcoal)] mb-1.5">Subject</label>
                      <select id="subject" name="subject" className="input-field" value={form.subject} onChange={handleChange} required>
                        <option value="">Select a topic…</option>
                        <option value="partnership">Gym Partnership Inquiry</option>
                        <option value="membership">Membership Help</option>
                        <option value="billing">Billing or Payment</option>
                        <option value="technical">Technical Support</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-semibold text-[var(--color-charcoal)] mb-1.5">Message</label>
                      <textarea
                        id="message"
                        name="message"
                        rows={5}
                        required
                        className="input-field resize-none"
                        placeholder="Describe your query…"
                        value={form.message}
                        onChange={handleChange}
                      />
                      <p className={`text-right text-xs mt-1 font-medium ${wordCount >= MAX_WORDS ? 'text-red-500' : 'text-[var(--color-muted)]'}`}>
                        {wordCount}/{MAX_WORDS} words
                      </p>
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                      <Send className="w-4 h-4" />
                      {loading ? 'Sending…' : 'Send Message'}
                    </button>
                  </form>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
