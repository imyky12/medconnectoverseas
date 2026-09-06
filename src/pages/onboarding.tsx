import { useState, useEffect } from 'react';
import OtpInput from '../components/ui/otp-input';
import { useNavigate } from 'react-router-dom';
import 'react-phone-number-input/style.css';
import PhoneInput, { getCountryCallingCode } from 'react-phone-number-input';
import type { Country } from 'react-phone-number-input';
import en from 'react-phone-number-input/locale/en.json';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardDescription, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Navbar from '../components/landing/navbar';
import { Loader2, ArrowRight, ArrowLeft, Stethoscope, HeartPulse, Activity, Hospital, ShieldCheck, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Step = 'intro' | 'name' | 'country' | 'source' | 'referral' | 'phone' | 'otp';
const stepOrder: Step[] = ['intro', 'name', 'country', 'source', 'referral', 'phone', 'otp'];

// Build sorted country list from react-phone-number-input's locale data
const countryList: { code: string; name: string }[] = Object.entries(en as Record<string, string>)
  .filter(([code]) => code !== 'ZZ' && code.length === 2)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

export default function OnboardingPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading, updateUser } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<Step>('intro');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [phone, setPhone] = useState<string | undefined>('');
  const [phoneCountry, setPhoneCountry] = useState<Country>('IN');
  const [howDidYouHearAboutUs, setHowDidYouHearAboutUs] = useState('');
  const [referredByCode, setReferredByCode] = useState('');
  const [otp, setOtp] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const pending = localStorage.getItem('pendingReferralCode');
    if (pending) setReferredByCode(pending);
  }, []);

  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated) navigate('/');
      else if (user?.isOnboardingComplete) navigate('/dashboard');
    }
  }, [isAuthLoading, isAuthenticated, user, navigate]);

  if (isAuthLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-ink h-10 w-10" />
      </div>
    );
  }

  const currentIndex = stepOrder.indexOf(currentStep);
  const progressPercentage = (currentIndex / (stepOrder.length - 1)) * 100;

  const nextStep = () => {
    setError('');
    setCountrySearch('');
    if (currentIndex < stepOrder.length - 1) setCurrentStep(stepOrder[currentIndex + 1]);
  };

  const prevStep = () => {
    setError('');
    setCountrySearch('');
    if (currentIndex > 0) setCurrentStep(stepOrder[currentIndex - 1]);
  };

  const handleSendOtp = async () => {
    if (!phone) { setError('Please enter a valid phone number'); return; }
    setIsLoading(true);
    setError('');
    try {
      const dialCode = phoneCountry ? `+${getCountryCallingCode(phoneCountry)}` : '+91';
      const res: any = await api.post('/profile/request-mobile-otp', { mobile: phone, countryCode: dialCode });
      if (res.success) nextStep();
      else setError(res.message || 'Failed to send OTP.');
    } catch (err: any) {
      setError(err.message || 'Error occurred while sending OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (otp.length !== 6) return;
    setIsLoading(true);
    setError('');
    try {
      const dialCode = phoneCountry ? `+${getCountryCallingCode(phoneCountry)}` : '+91';
      const res: any = await api.post('/profile/onboarding', {
        firstName,
        lastName,
        country,
        mobile: phone,
        countryCode: dialCode,
        howDidYouHearAboutUs,
        otp,
        referredByCode: referredByCode.trim().toUpperCase() || undefined,
      });
      if (res.success) {
        localStorage.removeItem('pendingReferralCode');
        updateUser(res.data.user);
        navigate('/dashboard');
      } else {
        setError(res.message || 'Failed to complete onboarding.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCountries = countrySearch.trim()
    ? countryList.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
    : countryList;

  const slideVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar hideLinks={true} />

      <main className="flex-1 flex flex-col items-center justify-center py-20 px-4">
        <div className="w-full max-w-lg">
          {currentIndex > 0 && (
            <div className="mb-8">
              <Progress value={progressPercentage} className="h-2 bg-gray-200 text-ink" />
              <div className="text-right text-sm text-gray-500 mt-2 font-medium">
                Step {currentIndex} of {stepOrder.length - 1}
              </div>
            </div>
          )}

          <Card className="shadow-lg border-0 bg-white min-h-[400px] flex flex-col relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col"
              >

                {currentStep === 'intro' && (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="h-20 w-20 bg-ink/10 rounded-full flex items-center justify-center mb-6">
                      <Stethoscope className="h-10 w-10 text-ink" />
                    </div>
                    <CardTitle className="text-3xl text-ink mb-4">Let us set up your profile</CardTitle>
                    <CardDescription className="text-base text-gray-600 mb-8 max-w-sm">
                      We need a few details to build your medical student profile. It only takes a minute.
                    </CardDescription>
                    <Button onClick={nextStep} className="bg-ink hover:bg-ink text-white px-8 py-6 rounded-full text-lg w-full">
                      Get started <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                )}

                {currentStep === 'name' && (
                  <div className="flex-1 flex flex-col p-8 pb-4">
                    <div className="flex items-center mb-6">
                      <Activity className="h-6 w-6 text-ink mr-3" />
                      <CardTitle className="text-2xl text-ink">What should we call you?</CardTitle>
                    </div>
                    <div className="space-y-6 flex-1">
                      <div className="space-y-2">
                        <Label className="text-gray-700">First Name</Label>
                        <Input autoFocus value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="E.g. John" className="h-14 text-lg bg-gray-50 border-gray-200" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-700">Last Name</Label>
                        <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="E.g. Doe" className="h-14 text-lg bg-gray-50 border-gray-200" />
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-8">
                      <Button variant="ghost" onClick={prevStep} className="text-gray-500"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                      <Button onClick={nextStep} disabled={!firstName.trim() || !lastName.trim()} className="bg-ink hover:bg-ink text-white px-8 h-12">
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 'country' && (
                  <div className="flex-1 flex flex-col p-8 pb-4">
                    <div className="flex items-center mb-6">
                      <Hospital className="h-6 w-6 text-ink mr-3" />
                      <CardTitle className="text-2xl text-ink">Where are you based?</CardTitle>
                    </div>
                    <div className="flex-1 flex flex-col gap-3 min-h-0">
                      <div className="space-y-2">
                        <Label className="text-gray-700">Country of Residence</Label>
                        <Input
                          autoFocus
                          value={countrySearch}
                          onChange={e => { setCountrySearch(e.target.value); setCountry(''); }}
                          placeholder="Search country…"
                          className="h-12 bg-gray-50 border-gray-200"
                        />
                        {country && (
                          <p className="text-xs text-ink font-semibold">Selected: {country}</p>
                        )}
                      </div>
                      <div className="border border-gray-200 rounded-lg overflow-y-auto max-h-52 bg-white">
                        {filteredCountries.length === 0 ? (
                          <p className="text-sm text-gray-400 p-4 text-center">No countries found</p>
                        ) : (
                          filteredCountries.map(c => (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => { setCountry(c.name); setCountrySearch(c.name); }}
                              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${country === c.name ? 'bg-ink text-white font-semibold' : 'hover:bg-gray-50 text-gray-700'}`}
                            >
                              {c.name}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-6">
                      <Button variant="ghost" onClick={prevStep} className="text-gray-500"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                      <Button onClick={nextStep} disabled={!country.trim()} className="bg-ink hover:bg-ink text-white px-8 h-12">
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 'source' && (
                  <div className="flex-1 flex flex-col p-8 pb-4">
                    <div className="flex items-center mb-6">
                      <HeartPulse className="h-6 w-6 text-ink mr-3" />
                      <CardTitle className="text-2xl text-ink">How did you hear about us?</CardTitle>
                    </div>
                    <div className="space-y-4 flex-1">
                      {['Social Media', 'Friend / Colleague', 'Search Engine', 'Event / Seminar', 'Other'].map((option) => (
                        <div
                          key={option}
                          onClick={() => setHowDidYouHearAboutUs(option)}
                          className={`p-4 rounded-lg border-2 cursor-pointer font-medium transition-colors ${howDidYouHearAboutUs === option ? 'border-ink bg-ink/5 text-ink' : 'border-gray-100 bg-white hover:border-gray-200 text-gray-700'}`}
                        >
                          {option}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-8">
                      <Button variant="ghost" onClick={prevStep} className="text-gray-500"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                      <Button onClick={nextStep} disabled={!howDidYouHearAboutUs} className="bg-ink hover:bg-ink text-white px-8 h-12">
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 'referral' && (
                  <div className="flex-1 flex flex-col p-8 pb-4">
                    <div className="flex items-center mb-6">
                      <Gift className="h-6 w-6 text-ink mr-3" />
                      <CardTitle className="text-2xl text-ink">Were you referred by someone?</CardTitle>
                    </div>
                    <p className="text-gray-500 text-sm mb-6">If a friend referred you, enter their code to get a discount on your first course. Skip if you don't have one.</p>
                    <div className="space-y-2 flex-1">
                      <Label className="text-gray-700">Referral Code (optional)</Label>
                      <Input
                        autoFocus
                        value={referredByCode}
                        onChange={e => setReferredByCode(e.target.value.toUpperCase())}
                        placeholder="E.g. 4567"
                        className="h-14 text-lg bg-gray-50 border-gray-200  font-mono "
                        maxLength={20}
                      />
                      {referredByCode && (
                        <p className="text-xs text-ink font-medium mt-1">
                          Code applied: <span className="font-mono font-bold">{referredByCode}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-8">
                      <Button variant="ghost" onClick={prevStep} className="text-gray-500"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                      <Button onClick={nextStep} className="bg-ink hover:bg-ink text-white px-8 h-12">
                        {referredByCode.trim() ? 'Apply & Continue' : 'Skip'} <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 'phone' && (
                  <div className="flex-1 flex flex-col p-8 pb-4">
                    <div className="flex items-center mb-6">
                      <ShieldCheck className="h-6 w-6 text-ink mr-3" />
                      <CardTitle className="text-2xl text-ink">Your mobile number</CardTitle>
                    </div>
                    <p className="text-gray-600 mb-6 font-medium">Please provide your mobile number for a secure SMS verification code.</p>
                    <div className="space-y-2 flex-1">
                      <Label className="text-gray-700">Mobile Number</Label>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 h-14 flex items-center">
                        <PhoneInput
                          international
                          defaultCountry="IN"
                          value={phone}
                          onChange={setPhone}
                          onCountryChange={(c) => { if (c) setPhoneCountry(c); }}
                          className="w-full bg-transparent border-0 outline-none focus:ring-0 text-lg px-2"
                        />
                      </div>
                      {error && <p className="text-declined text-sm font-medium mt-2">{error}</p>}
                    </div>
                    <div className="flex justify-between items-center mt-8">
                      <Button variant="ghost" onClick={prevStep} className="text-gray-500" disabled={isLoading}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                      <Button onClick={handleSendOtp} disabled={!phone || isLoading} className="bg-ink hover:bg-ink text-white px-8 h-12">
                        {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Send OTP'}
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 'otp' && (
                  <div className="flex-1 flex flex-col p-8 pb-4 items-center text-center">
                    <div className="flex items-center justify-center mb-6 w-16 h-16 bg-ink/10 rounded-full">
                      <ShieldCheck className="h-8 w-8 text-ink" />
                    </div>
                    <CardTitle className="text-2xl text-ink mb-2">Check your messages</CardTitle>
                    <p className="text-gray-500 mb-8 max-w-sm">
                      We've sent a 6-digit code to <span className="font-medium text-ink">{phone}</span>.
                    </p>
                    <div className="w-full mb-8 flex-1">
                      <OtpInput
                        value={otp}
                        onChange={setOtp}
                        invalid={!!error}
                        label="The 6-digit code we texted you"
                      />
                      {error && <p className="text-declined text-sm font-medium mt-3">{error}</p>}
                    </div>
                    <div className="w-full space-y-4">
                      <Button
                        onClick={handleSubmit}
                        disabled={otp.length !== 6 || isLoading}
                        className="w-full bg-ink hover:bg-ink text-white h-14 rounded-full text-lg shadow-md"
                      >
                        {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Finish setting up'}
                      </Button>
                      <Button variant="ghost" onClick={prevStep} className="text-gray-500" disabled={isLoading}>
                        Change Number
                      </Button>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </Card>
        </div>
      </main>
    </div>
  );
}
