import React, { useState, useEffect } from 'react';
import { X, Loader2, Mail } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import OtpInput from '../ui/otp-input';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** After successful login, navigate here instead of /dashboard */
  redirectTo?: string;
}

export default function AuthModal({ isOpen, onClose, redirectTo }: AuthModalProps) {
  const { login } = useAuth();

  // Persist any ?ref= param from the URL so onboarding can use it
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) localStorage.setItem('pendingReferralCode', ref.toUpperCase());
  }, []);
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res: any = await api.post('/auth/request-otp', { email });
      if (res.success) {
        setStep('otp');
      } else {
        setError(res.message || 'Failed to send OTP.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res: any = await api.post('/auth/verify-otp', { email, otp });
      if (res.success) {
        const { user, tokens } = res.data;
        login(user, tokens.access.token, tokens.refresh.token);
        onClose();

        if (!user.isOnboardingComplete) {
          window.location.href = '/onboarding';
        } else if (redirectTo) {
          window.location.href = redirectTo;
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        setError(res.message || 'Invalid OTP.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-800 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {step === 'email' ? 'Welcome Back' : 'Enter OTP'}
            </h2>
            <p className="text-gray-500 mt-2 text-sm">
              {step === 'email' 
                ? 'Enter your email to login or sign up. No password needed.'
                : `We've sent a 6-digit code to ${email}`}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center border border-red-100">
              {error}
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 rounded-xl border-gray-200 focus:border-[#041c44] focus:ring-[#041c44]"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl bg-[#041c44] hover:bg-[#031533] text-white font-medium flex items-center justify-center"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Continue with Email'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <OtpInput
                value={otp}
                onChange={setOtp}
                invalid={!!error}
                label="The 6-digit code we emailed you"
              />
              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl bg-[#041c44] hover:bg-[#031533] text-white font-medium flex items-center justify-center"
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify Code'}
              </Button>
              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full text-sm text-gray-500 hover:text-[#041c44] transition-colors mt-2"
              >
                Use a different email
              </button>
            </form>
          )}
        </div>
        
        <div className="bg-gray-50 p-4 text-center text-xs text-gray-500 border-t border-gray-100">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </div>
      </div>
    </div>
  );
}
