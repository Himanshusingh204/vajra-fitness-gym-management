import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

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
    <div className="flex items-center justify-center min-h-[70vh] bg-[var(--color-base)] py-12 px-4">
      <div className="card w-full max-w-2xl shadow-2xl">
        <h1 className="text-3xl font-bold text-center mb-2 text-[var(--color-charcoal)]">Partner with Vajra Fitness</h1>
        <p className="text-center text-[var(--color-muted)] mb-8">Register your gym and upgrade to premium management software.</p>
        
        {error && <div className="bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 p-3 rounded-xl mb-4 text-sm border border-red-200 dark:border-red-500/20">{error}</div>}
        {success && <div className="bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 p-3 rounded-xl mb-4 text-sm border border-green-200 dark:border-green-500/20">{success}</div>}

        <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleRegister}>
          <div className="md:col-span-2">
            <h2 className="text-lg font-semibold border-b pb-2 mb-2 text-[var(--color-primary)]">Owner Details</h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-charcoal)] mb-1">Owner Name</label>
            <input name="username" type="text" className="input-field" placeholder="Full Name" onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-charcoal)] mb-1">Email</label>
            <input name="email" type="email" className="input-field" placeholder="owner@example.com" onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-charcoal)] mb-1">Mobile Number</label>
            <input name="phone" type="tel" className="input-field" placeholder="+91" onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-charcoal)] mb-1">Password</label>
            <input name="password" type="password" className="input-field" placeholder="At least 8 characters, with a letter and number" onChange={handleChange} minLength={8} required />
          </div>

          <div className="md:col-span-2 mt-2">
            <h2 className="text-lg font-semibold border-b pb-2 mb-2 text-[var(--color-primary)]">Gym Details</h2>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[var(--color-charcoal)] mb-1">Gym Name</label>
            <input name="gymName" type="text" className="input-field" placeholder="e.g. Marwar Muscle HQ" onChange={handleChange} required />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[var(--color-charcoal)] mb-1">Complete Address</label>
            <textarea name="address" className="input-field" rows={3} placeholder="Street address" onChange={handleChange} required></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-charcoal)] mb-1">State</label>
            <input name="state" type="text" className="input-field" placeholder="e.g. Rajasthan" onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-charcoal)] mb-1">City</label>
            <input name="city" type="text" className="input-field" placeholder="e.g. Jodhpur" onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-charcoal)] mb-1">Pincode</label>
            <input name="pincode" type="text" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" className="input-field" placeholder="6-digit pincode" onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-charcoal)] mb-1">GST Number (Optional)</label>
            <input name="gstNumber" type="text" className="input-field" placeholder="GSTIN" onChange={handleChange} />
          </div>

          <div className="md:col-span-2 mt-6">
            <button type="submit" className="btn-primary w-full text-lg py-3 flex justify-center items-center" disabled={isLoading}>
              {isLoading ? 'Submitting...' : 'Submit Registration Request'}
            </button>
          </div>
        </form>
        
        <div className="mt-6 text-center text-sm text-[var(--color-muted)]">
          Already a partner? <Link to="/login" className="text-[var(--color-primary)] font-semibold hover:underline">Login Here</Link>
        </div>
      </div>
    </div>
  );
};

export default VendorRegisterPage;
