import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getPasswordStrength = (pass) => {
  if (!pass) return null;
  if (pass.length < 6) {
    return { level: 'Weak', color: 'text-red-600', bg: 'bg-red-500', width: 'w-1/3' };
  }
  const hasNumber = /\d/.test(pass);
  if (pass.length >= 10 && hasNumber) {
    return { level: 'Strong', color: 'text-emerald-600', bg: 'bg-emerald-500', width: 'w-full' };
  }
  return { level: 'Medium', color: 'text-amber-600', bg: 'bg-amber-500', width: 'w-2/3' };
};

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Field-specific validation errors & touched states
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState('');

  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const validateField = (field, value) => {
    let errorMsg = '';
    if (field === 'name') {
      if (!value.trim()) {
        errorMsg = 'Full name is required.';
      } else if (value.trim().length < 2) {
        errorMsg = 'Name must be at least 2 characters long.';
      }
    } else if (field === 'email') {
      if (!value.trim()) {
        errorMsg = 'Email address is required.';
      } else if (!EMAIL_REGEX.test(value.trim())) {
        errorMsg = 'Please enter a valid email address.';
      }
    } else if (field === 'password') {
      if (!value) {
        errorMsg = 'Password is required.';
      } else if (value.length < 6) {
        errorMsg = 'Password must be at least 6 characters long.';
      }
    }
    return errorMsg;
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    let val = '';
    if (field === 'name') val = name;
    if (field === 'email') val = email;
    if (field === 'password') val = password;
    const err = validateField(field, val);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleChange = (field, value) => {
    if (field === 'name') setName(value);
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
    const nameErr = validateField('name', name);
    const emailErr = validateField('email', email);
    const passErr = validateField('password', password);

    setTouched({ name: true, email: true, password: true });
    setErrors({ name: nameErr, email: emailErr, password: passErr });

    if (nameErr || emailErr || passErr) {
      return;
    }

    const res = await register(name, email, password);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setServerError(res.error || 'Failed to register account.');
    }
  };

  const passwordStrength = getPasswordStrength(password);
  const hasErrors = Object.values(errors).some((err) => Boolean(err));

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-xl bg-sky-600 text-white shadow-md shadow-sky-300 mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create Agent Account</h1>
          <p className="text-sm text-slate-500 mt-1">
            Get started with RecoveryIQ Decision Portal
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
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleChange('name', e.target.value)}
              onBlur={() => handleBlur('name')}
              placeholder="Aditi Sharma"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 ${
                touched.name && errors.name
                  ? 'border-red-300 bg-red-50/20 focus:ring-red-500 focus:border-transparent'
                  : 'border-slate-300 focus:ring-sky-500 focus:border-transparent'
              }`}
            />
            {touched.name && errors.name && (
              <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center">
                <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                {errors.name}
              </p>
            )}
          </div>

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

            {/* Password Strength Indicator while typing */}
            {password.length > 0 && passwordStrength && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Password strength:</span>
                  <span className={`font-bold ${passwordStrength.color}`}>
                    {passwordStrength.level}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${passwordStrength.bg} ${passwordStrength.width} transition-all duration-300`}
                  />
                </div>
              </div>
            )}

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
            <span>{loading ? 'Registering...' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-sky-600 hover:underline font-semibold">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
