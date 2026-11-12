import { useState } from 'react';
import { useAuth } from '../../context/useAuth';

export default function CustomerRegister({ onSwitchToLogin, onRegisterSuccess }) {
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'Legal name is required';
        if (value.trim().length < 2) return 'Min 2 characters required';
        if (value.trim().length > 80) return 'Max 80 characters allowed';
        return null;

      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email address';
        return null;

      case 'phone':
        if (!value.trim()) return 'Phone number is required';
        if (!/^\+?[0-9\s-]{7,15}$/.test(value.trim())) {
          return 'Enter 7-15 digits (e.g. +91 9876543210)';
        }
        return null;

      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Minimum 8 characters required';
        if (new TextEncoder().encode(value).length > 72) return 'Max 72 bytes';
        return null;

      case 'confirmPassword':
        if (!value) return 'Confirm your password';
        if (value !== formData.password) return 'Passwords do not match';
        return null;

      default:
        return null;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setApiError(null);
    setSuccessMsg(null);

    if (touched[name]) {
      const err = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: err }));
    }

    if (name === 'password' && touched.confirmPassword) {
      const confirmErr = value !== formData.confirmPassword ? 'Passwords do not match' : null;
      setErrors((prev) => ({ ...prev, confirmPassword: confirmErr }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);
    setSuccessMsg(null);

    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const err = validateField(key, formData[key]);
      if (err) newErrors[key] = err;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched({
        name: true,
        email: true,
        phone: true,
        password: true,
        confirmPassword: true,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      });

      setSuccessMsg('Account registered successfully. You may now sign in.');
      if (onRegisterSuccess) {
        onRegisterSuccess(formData.email);
      } else {
        setTimeout(() => {
          onSwitchToLogin();
        }, 1200);
      }
    } catch (err) {
      setApiError(err.message || 'Registration failed. Please check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-100 uppercase font-sans">
          Customer Registration
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Create your customer profile to join centralized car waiting queues.
        </p>
      </div>

      {successMsg && (
        <div className="mb-5 p-3 border border-emerald-900/60 bg-emerald-950/20 text-emerald-400 text-xs font-mono flex items-center space-x-2.5">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-none flex-shrink-0"></span>
          <div className="leading-relaxed">{successMsg}</div>
        </div>
      )}

      {apiError && (
        <div className="mb-5 p-3 border border-red-900/60 bg-red-950/20 text-red-400 text-xs font-mono flex items-center space-x-2.5">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-none flex-shrink-0"></span>
          <div className="leading-relaxed">{apiError}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <div className="flex justify-between items-center mb-1">
            <label
              htmlFor="reg-name"
              className="text-[11px] font-mono uppercase tracking-wider text-neutral-400"
            >
              Full Legal Name
            </label>
            {errors.name && touched.name && (
              <span className="text-[10px] font-mono text-red-400">{errors.name}</span>
            )}
          </div>
          <input
            id="reg-name"
            name="name"
            type="text"
            autoComplete="name"
            value={formData.name}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="John Doe"
            className={`w-full bg-[#161616] border px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none transition-colors duration-150 rounded-[2px] font-mono ${
              errors.name && touched.name
                ? 'border-red-800 focus:border-red-500'
                : 'border-[#262626] focus:border-[#ff7849]'
            }`}
          />
        </div>

        {/* Email & Phone Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label
                htmlFor="reg-email"
                className="text-[11px] font-mono uppercase tracking-wider text-neutral-400"
              >
                Email Address
              </label>
            </div>
            <input
              id="reg-email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="client@domain.com"
              className={`w-full bg-[#161616] border px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none transition-colors duration-150 rounded-[2px] font-mono ${
                errors.email && touched.email
                  ? 'border-red-800 focus:border-red-500'
                  : 'border-[#262626] focus:border-[#ff7849]'
              }`}
            />
            {errors.email && touched.email && (
              <span className="text-[10px] font-mono text-red-400 block mt-1">
                {errors.email}
              </span>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label
                htmlFor="reg-phone"
                className="text-[11px] font-mono uppercase tracking-wider text-neutral-400"
              >
                Phone Number
              </label>
            </div>
            <input
              id="reg-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={formData.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="+91 9876543210"
              className={`w-full bg-[#161616] border px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none transition-colors duration-150 rounded-[2px] font-mono ${
                errors.phone && touched.phone
                  ? 'border-red-800 focus:border-red-500'
                  : 'border-[#262626] focus:border-[#ff7849]'
              }`}
            />
            {errors.phone && touched.phone && (
              <span className="text-[10px] font-mono text-red-400 block mt-1">
                {errors.phone}
              </span>
            )}
          </div>
        </div>

        {/* Password & Confirm Password Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label
                htmlFor="reg-password"
                className="text-[11px] font-mono uppercase tracking-wider text-neutral-400"
              >
                Password
              </label>
            </div>
            <div className="relative">
              <input
                id="reg-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="••••••••••••"
                className={`w-full bg-[#161616] border px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none transition-colors duration-150 rounded-[2px] font-mono pr-14 ${
                  errors.password && touched.password
                    ? 'border-red-800 focus:border-red-500'
                    : 'border-[#262626] focus:border-[#ff7849]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-neutral-500 hover:text-neutral-300 uppercase px-1 py-0.5"
                tabIndex={-1}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password && touched.password && (
              <span className="text-[10px] font-mono text-red-400 block mt-1">
                {errors.password}
              </span>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label
                htmlFor="reg-confirmPassword"
                className="text-[11px] font-mono uppercase tracking-wider text-neutral-400"
              >
                Confirm Password
              </label>
            </div>
            <input
              id="reg-confirmPassword"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="••••••••••••"
              className={`w-full bg-[#161616] border px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none transition-colors duration-150 rounded-[2px] font-mono ${
                errors.confirmPassword && touched.confirmPassword
                  ? 'border-red-800 focus:border-red-500'
                  : 'border-[#262626] focus:border-[#ff7849]'
              }`}
            />
            {errors.confirmPassword && touched.confirmPassword && (
              <span className="text-[10px] font-mono text-red-400 block mt-1">
                {errors.confirmPassword}
              </span>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 bg-[#ff7849] hover:bg-[#ff8f66] text-neutral-950 font-mono text-xs uppercase tracking-wider font-bold py-3 px-4 rounded-[2px] border border-[#ff7849] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-orange-950/20"
        >
          {isSubmitting ? (
            <>
              <div className="w-3 h-3 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin"></div>
              <span>Creating account...</span>
            </>
          ) : (
            <span>Create Account</span>
          )}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="mt-6 pt-5 border-t border-[#222222] flex items-center justify-between text-xs">
        <span className="text-neutral-500">Already have an account?</span>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-mono text-xs text-[#ff7849] hover:text-[#ff8f66] uppercase tracking-wide transition-colors duration-150"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
