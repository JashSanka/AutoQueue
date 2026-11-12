import { useState } from 'react';
import { useAuth } from '../../context/useAuth';

export default function CustomerLogin({ onSwitchToRegister, onSuccess }) {
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  const validateField = (name, value) => {
    switch (name) {
      case 'email':
        if (!value.trim()) return 'Email address is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format';
        return null;
      case 'password':
        if (!value) return 'Password is required';
        return null;
      default:
        return null;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setApiError(null);

    if (touched[name]) {
      const err = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: err }));
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

    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const err = validateField(key, formData[key]);
      if (err) newErrors[key] = err;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched({ email: true, password: true });
      return;
    }

    setIsSubmitting(true);
    try {
      await login(formData.email, formData.password);
      if (onSuccess) onSuccess();
    } catch (err) {
      setApiError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-100 uppercase font-sans">
          Customer Sign In
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Access your centralized car reservation queues and active dealer offers.
        </p>
      </div>

      {apiError && (
        <div className="mb-6 p-3 border border-red-900/60 bg-red-950/20 text-red-400 text-xs font-mono flex items-center space-x-2.5">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-none flex-shrink-0"></span>
          <div className="leading-relaxed">{apiError}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label
              htmlFor="login-email"
              className="text-[11px] font-mono uppercase tracking-wider text-neutral-400"
            >
              Email Address
            </label>
            {errors.email && touched.email && (
              <span className="text-[10px] font-mono text-red-400 tracking-tight">
                {errors.email}
              </span>
            )}
          </div>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="client@domain.com"
            className={`w-full bg-[#161616] border px-3.5 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none transition-colors duration-150 rounded-[2px] font-mono ${
              errors.email && touched.email
                ? 'border-red-800 focus:border-red-500'
                : 'border-[#262626] focus:border-[#ff7849]'
            }`}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label
              htmlFor="login-password"
              className="text-[11px] font-mono uppercase tracking-wider text-neutral-400"
            >
              Password
            </label>
            {errors.password && touched.password && (
              <span className="text-[10px] font-mono text-red-400 tracking-tight">
                {errors.password}
              </span>
            )}
          </div>
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="••••••••••••"
              className={`w-full bg-[#161616] border px-3.5 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none transition-colors duration-150 rounded-[2px] font-mono pr-14 ${
                errors.password && touched.password
                  ? 'border-red-800 focus:border-red-500'
                  : 'border-[#262626] focus:border-[#ff7849]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-neutral-500 hover:text-neutral-300 uppercase px-1.5 py-1 transition-colors duration-150"
              tabIndex={-1}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 bg-[#ff7849] hover:bg-[#ff8f66] text-neutral-950 font-mono text-xs uppercase tracking-wider font-bold py-3 px-4 rounded-[2px] border border-[#ff7849] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-orange-950/20"
        >
          {isSubmitting ? (
            <>
              <div className="w-3 h-3 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin"></div>
              <span>Authenticating...</span>
            </>
          ) : (
            <span>Sign In</span>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-[#222222] flex flex-col space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-500">Need a customer account?</span>
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-mono text-xs text-[#ff7849] hover:text-[#ff8f66] uppercase tracking-wide transition-colors duration-150"
          >
            Create Account
          </button>
        </div>

        <div className="bg-[#121212] border border-[#222222] p-2.5 text-[11px] font-mono text-neutral-500 leading-relaxed">
          <span className="text-neutral-400 font-medium">Dealer or Admin</span> Dealership personnel and system administrators must sign in through their dedicated portals.
        </div>
      </div>
    </div>
  );
}
