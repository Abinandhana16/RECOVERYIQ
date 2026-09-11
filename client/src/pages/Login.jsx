import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Field-specific validation errors & touched states
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState('');

  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const validateField = (field, value) => {
    let errorMsg = '';
    if (field === 'email') {
      if (!value.trim()) {
        errorMsg = 'Email address is required.';
      } else if (!EMAIL_REGEX.test(value.trim())) {
        errorMsg = 'Please enter a valid email address.';
      }
    } else if (field === 'password') {
      if (!value) {
        errorMsg = 'Password is required.';
      }
    }
    return errorMsg;
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const val = field === 'email' ? email : password;
    const err = validateField(field, val);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleChange = (field, value) => {
    if (field === 'email') setEmail(value);
    if (field === 'password') setPassword(value);

    // If already touched, validate live
    if (touched[field]) {
      const err = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    // Mark all touched and validate
    const emailErr = validateField('email', email);
    const passErr = validateField('password', password);

    setTouched({ email: true, password: true });
    setErrors({ email: emailErr, password: passErr });

    if (emailErr || passErr) {
      return;
    }

    const res = await login(email, password);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setServerError(res.error || 'Failed to login. Please check your credentials.');
    }
  };

  const hasErrors = Object.values(errors).some((err) => Boolean(err));

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-xl bg-sky-600 text-white shadow-md shadow-sky-300 mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Sign in to RecoveryIQ</h1>
          <p className="text-sm text-slate-500 mt-1">
            AI-Powered Financial Recovery & Decision Engine
          </p>
        </div>

        {serverError && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              placeholder="agent@recoveryiq.com"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 ${
                touched.email && errors.email
                  ? 'border-red-300 bg-red-50/20 focus:ring-red-500 focus:border-transparent'
                  : 'border-slate-300 focus:ring-sky-500 focus:border-transparent'
              }`}
            />
            {touched.email && errors.email && (
              <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center">
                <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => handleChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                placeholder="••••••••"
                className={`w-full pl-4 pr-11 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 ${
                  touched.password && errors.password
                    ? 'border-red-300 bg-red-50/20 focus:ring-red-500 focus:border-transparent'
                    : 'border-slate-300 focus:ring-sky-500 focus:border-transparent'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors p-1"
              >
                {showPassword ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
            </div>
            {touched.password && errors.password && (
              <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center">
                <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                {errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || hasErrors}
            className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-md shadow-sky-200 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Don't have an agent account?{' '}
          <Link to="/register" className="text-sky-600 hover:underline font-semibold">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
