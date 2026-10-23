import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Building2, User, Mail, Phone, Lock, MapPin, FileText, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import AuthSplitLayout from '../components/AuthSplitLayout';

const VendorRegisterPage = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    phone: '',
    gymName: '',
    address: '',
    state: '',
    city: '',
    pincode: '',
    gstNumber: ''
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const normalizedPhone = formData.phone.replace(/[\s-]/g, '');
    const phoneValid = /^(\+?91[\s-]?)?([6-9]\d{9})$/.test(normalizedPhone);
    if (!phoneValid) {
      setError('Please enter a valid 10-digit Indian mobile number (starting with 6-9).');
      setIsLoading(false);
      return;
    }
    if (formData.pincode && !/^[1-9][0-9]{5}$/.test(formData.pincode)) {
      setError('Pincode must be exactly 6 digits.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/register/vendor', formData);
      const { token, user: newUser } = response.data;
      setAuth(newUser, token);
      setSuccess('Registration successful! Redirecting to your gym dashboard...');
      setTimeout(() => navigate('/admin/gym'), 1200);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      badge="Gym Business Partner"
      title="Partner with Vajra"
      subtitle="Supercharge your gym with automated billing, instant QR check-ins, trainer schedules, and member analytics."
      imageSrc="/images/auth-register.jpg"
      imageAlt="Vajra Luxury Gym Interior"
      quote="Elevate your gym from a local training hall to an elite, modern fitness facility."
      quoteAuthor="Vajra Enterprise Cloud"
      features={[
        { title: 'Auto Subscriptions', description: 'Zero payment leakage' },
        { title: 'Staff Delegation', description: 'Trainer & receptionist logins' },
        { title: 'GST Ready Billing', description: 'Automated tax receipts' },
      ]}
      maxWidth="max-w-2xl"
    >
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm font-medium flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-6">
        {/* Section 1: Owner Details */}
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--color-border)]">
            <User className="w-4 h-4 text-[var(--color-primary)]" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--color-charcoal)] dark:text-white">
              1. Owner Information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--color-charcoal)] dark:text-gray-200 mb-1.5">
                Owner Full Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-muted)]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  name="username"
                  type="text"
                  className="input-field pl-10"
                  placeholder="e.g. Vikramaditya Singh"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-charcoal)] dark:text-gray-200 mb-1.5">
                Email Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-muted)]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  name="email"
                  type="email"
                  className="input-field pl-10"
                  placeholder="owner@yourgym.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-charcoal)] dark:text-gray-200 mb-1.5">
                Mobile Number *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-muted)]">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  name="phone"
                  type="tel"
                  className="input-field pl-10"
                  placeholder="+91 9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-charcoal)] dark:text-gray-200 mb-1.5">
                Account Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-muted)]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  name="password"
                  type="password"
                  className="input-field pl-10"
                  placeholder="Min 8 chars with letter & number"
                  value={formData.password}
                  onChange={handleChange}
                  minLength={8}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Gym Facility Details */}
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--color-border)]">
            <Building2 className="w-4 h-4 text-[var(--color-accent)]" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--color-charcoal)] dark:text-white">
              2. Facility & Location Details
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[var(--color-charcoal)] dark:text-gray-200 mb-1.5">
                Gym Brand / Facility Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-muted)]">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  name="gymName"
                  type="text"
                  className="input-field pl-10"
                  placeholder="e.g. Iron Fortress Fitness Club"
                  value={formData.gymName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[var(--color-charcoal)] dark:text-gray-200 mb-1.5">
                Complete Street Address *
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3.5 pointer-events-none text-[var(--color-muted)]">
                  <MapPin className="w-4 h-4" />
                </div>
                <textarea
                  name="address"
                  rows={2}
                  className="input-field pl-10"
                  placeholder="Building No, Floor, Street, Landmark"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-charcoal)] dark:text-gray-200 mb-1.5">
                City *
              </label>
              <input
                name="city"
                type="text"
                className="input-field"
                placeholder="e.g. Jaipur"
                value={formData.city}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-charcoal)] dark:text-gray-200 mb-1.5">
                State *
              </label>
              <input
                name="state"
                type="text"
                className="input-field"
                placeholder="e.g. Rajasthan"
                value={formData.state}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-charcoal)] dark:text-gray-200 mb-1.5">
                Pincode (6 Digits)
              </label>
              <input
                name="pincode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                pattern="[0-9]{6}"
                className="input-field"
                placeholder="302001"
                value={formData.pincode}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-charcoal)] dark:text-gray-200 mb-1.5">
                GSTIN (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-muted)]">
                  <FileText className="w-4 h-4" />
                </div>
                <input
                  name="gstNumber"
                  type="text"
                  className="input-field pl-10 uppercase"
                  placeholder="22AAAAA0000A1Z5"
                  value={formData.gstNumber}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Security badge note */}
        <div className="p-3 rounded-xl bg-[var(--color-base)] dark:bg-white/5 border border-[var(--color-border)] flex items-center gap-3 text-xs text-[var(--color-muted)]">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>By submitting, you agree to Vajra Terms of Service and Gym Partner Code of Conduct.</span>
        </div>

        {/* Action Button */}
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary py-3.5 text-base shadow-lg cursor-pointer"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting Facility Registration...
              </span>
            ) : (
              <>
                <span>Submit Gym Registration Request</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Switcher back to login */}
      <div className="mt-6 pt-6 border-t border-[var(--color-border)] text-center text-sm text-[var(--color-muted)]">
        Already registered your gym?{' '}
        <Link to="/login" className="text-[var(--color-primary)] font-bold hover:underline">
          Sign In Here
        </Link>
      </div>
    </AuthSplitLayout>
  );
};

export default VendorRegisterPage;
