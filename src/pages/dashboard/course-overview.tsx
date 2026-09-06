import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import {
  Loader2, Clock, Users, Star, BookOpen, CheckCircle,
  ChevronRight, Tag, Globe, BarChart, AlertCircle, X, QrCode, Upload
} from 'lucide-react';
import ImageUpload from '../../components/ui/image-upload';

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-amber-100 text-holding',
  advanced: 'bg-red-100 text-red-700',
};

export default function CourseOverview() {
  const { courseCode } = useParams<{ courseCode: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<any>(null);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Checkout State
  const [showCheckout, setShowCheckout] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [finalPrice, setFinalPrice] = useState<number | null>(null);

  // Payment Upload State
  const [transactionId, setTransactionId] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const [courseRes, paymentRes] = await Promise.all([
          api.get(`/courses/detail/${courseCode}`),
          api.get('/payment-settings')
        ]);
        
        if ((courseRes as any).success) {
          setCourse((courseRes as any).data);
          setFinalPrice((courseRes as any).data.discountedPrice ?? (courseRes as any).data.price);
        } else {
          setError('Course not found.');
        }

        if ((paymentRes as any).success) {
          setPaymentSettings((paymentRes as any).data);
        }
      } catch {
        setError('Failed to load course.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourse();
  }, [courseCode]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const token = localStorage.getItem('accessToken');
      const res: any = await api.post('/courses/validate-coupon', {
        couponCode: couponCode.toUpperCase(),
        courseId: course._id,
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.success) {
        setAppliedCoupon(res.data.coupon);
        setFinalPrice(res.data.finalPrice);
      } else {
        setCouponError(res.message || 'Invalid coupon.');
      }
    } catch (e: any) {
      setCouponError(e?.response?.data?.message || 'Failed to apply coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
    setFinalPrice(course.discountedPrice ?? course.price);
  };

  const handleSubmitOrder = async () => {
    if (!transactionId.trim() || !screenshotUrl.trim()) {
      setSubmitError('Please fill in both the transaction ID and screenshot URL.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const token = localStorage.getItem('accessToken');
      const res: any = await api.post('/orders', {
        courseId: course._id,
        transactionId: transactionId.trim(),
        screenshotUrl: screenshotUrl.trim(),
        couponCode: appliedCoupon?.code,
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.success) {
        setSubmitSuccess(true);
      } else {
        setSubmitError(res.message || 'Failed to submit order.');
      }
    } catch (e: any) {
      setSubmitError(e?.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-ink" />
        <p className="text-sm text-muted">Loading course details…</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-base font-semibold text-body">{error || 'Course unavailable'}</p>
        <button onClick={() => navigate('/dashboard/marketplace')} className="text-sm text-ink hover:underline">
          Back to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-faint mb-6">
        <button onClick={() => navigate('/dashboard/marketplace')} className="hover:text-body transition-colors">Marketplace</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-body font-medium truncate max-w-xs">{course.title}</span>
      </nav>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Course Details — 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Thumbnail */}
          <div className="relative h-64 md:h-80 rounded-lg overflow-hidden bg-rule-soft">
            <img
              src={course.thumbnail || 'https://placehold.co/800x400/041c44/white?text=MCO'}
              alt={course.title}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = 'https://placehold.co/800x400/041c44/white?text=MCO'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-5 left-5">
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded  ${difficultyColors[course.difficulty] || 'bg-rule-soft text-muted'}`}>
                {course.difficulty}
              </span>
            </div>
          </div>

          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-bold text-ink ">{course.category}</span>
              <span className="text-faint">•</span>
              <span className="font-mono text-[11px] bg-rule-soft text-muted px-2 py-0.5 rounded">{course.courseCode}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-ink mb-3 leading-tight">{course.title}</h1>
            <p className="text-sm text-muted leading-relaxed mb-4">{course.shortDescription}</p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
              <div className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><span className="font-semibold text-body">4.8</span></div>
              <div className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-faint" />{course.estimatedDurationHours}h total</div>
              <div className="flex items-center gap-1.5"><Users className="h-4 w-4 text-faint" />{course.totalEnrollments || 0} students</div>
              <div className="flex items-center gap-1.5"><Globe className="h-4 w-4 text-faint" />{course.language || 'English'}</div>
              <div className="flex items-center gap-1.5"><BarChart className="h-4 w-4 text-faint" />{course.difficulty}</div>
            </div>
            <p className="mt-3 text-sm text-muted">Instructor: <span className="font-semibold text-body">{course.instructorName}</span></p>
          </div>

          {/* Description */}
          <div className="bg-white rounded-lg border border-rule p-6">
            <h2 className="text-base font-bold text-ink mb-3">About This Course</h2>
            <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{course.description}</p>
          </div>

          {/* Learning Outcomes */}
          {course.learningOutcomes?.length > 0 && (
            <div className="bg-white rounded-lg border border-rule p-6">
              <h2 className="text-base font-bold text-ink mb-4">What You'll Learn</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {course.learningOutcomes.map((item: string, i: number) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-body">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prerequisites */}
          {course.prerequisites?.length > 0 && (
            <div className="bg-holding-wash border border-amber-100 rounded-lg p-6">
              <h2 className="text-base font-bold text-ink mb-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Prerequisites
              </h2>
              <ul className="space-y-2">
                {course.prerequisites.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-body">
                    <span className="text-amber-500 font-bold">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Course Includes */}
          {course.courseIncludes?.length > 0 && (
            <div className="bg-white rounded-lg border border-rule p-6">
              <h2 className="text-base font-bold text-ink mb-4">This Course Includes</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {course.courseIncludes.map((item: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted">
                    <BookOpen className="h-4 w-4 text-ink shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Enrollment Panel — 1/3 */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <div className="bg-white rounded-lg border border-rule shadow-sm overflow-hidden">
              {/* Price */}
              <div className="p-6 border-b border-rule-soft">
                {/* Everything below is computed from the price actually payable.
                    The badge used to read the course's own discount only, so
                    applying a coupon dropped the price but left the badge saying
                    a smaller saving — two contradictory numbers side by side. */}
                {(() => {
                  const payable = finalPrice ?? course.discountedPrice ?? course.price;
                  const saved = Math.max(0, course.price - payable);
                  const pct = course.price > 0 ? Math.round((saved / course.price) * 100) : 0;
                  return (
                    <>
                      <div className="flex items-baseline gap-3 mb-1">
                        <span className="text-3xl font-extrabold text-ink">
                          {payable === 0 ? 'Free' : `₹${payable}`}
                        </span>
                        {saved > 0 && (
                          <span className="text-base text-faint line-through">₹{course.price}</span>
                        )}
                      </div>
                      {saved > 0 && (
                        <p className="text-xs text-green-600 font-semibold">
                          You save ₹{saved}{pct > 0 ? ` (${pct}% off)` : ''}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Coupon */}
              <div className="p-6 border-b border-rule-soft">
                <p className="text-xs font-bold text-body  mb-3 flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" /> Have a coupon?
                </p>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-xs font-bold text-green-700 font-mono">{appliedCoupon.code}</p>
                      <p className="text-[11px] text-green-600">Coupon applied successfully</p>
                    </div>
                    <button onClick={removeCoupon} className="text-faint hover:text-declined transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="ENTER CODE"
                      className="flex-1 h-10 px-3 rounded-lg border border-rule text-sm font-mono  placeholder:normal-case placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-ink/30 focus:border-ink"
                    />
                    <button
                      onClick={applyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="px-4 bg-rule-soft hover:bg-slate-200 text-body text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                    </button>
                  </div>
                )}
                {couponError && <p className="mt-2 text-xs text-declined">{couponError}</p>}
              </div>

              {/* Enroll CTA */}
              <div className="p-6">
                <button
                  onClick={() => setShowCheckout(true)}
                  className="w-full bg-ink hover:bg-ink text-white py-3.5 rounded-lg font-bold text-sm transition-colors shadow-sm"
                >
                  Enroll Now — ₹{finalPrice ?? (course.discountedPrice ?? course.price)}
                </button>
                <p className="text-center text-[11px] text-faint mt-3">
                  Manual payment via UPI. Access granted after payment verification.
                </p>
              </div>
            </div>

            {/* Quick info */}
            <div className="bg-white rounded-lg border border-rule p-5 space-y-3 text-sm">
              {[
                [Clock, `${course.estimatedDurationHours}h of content`],
                [Globe, `Language: ${course.language || 'English'}`],
                [BarChart, `Level: ${course.difficulty}`],
                [Users, `${course.totalEnrollments || 0} enrolled`],
              ].map(([Icon, text]: any, i) => (
                <div key={i} className="flex items-center gap-3 text-muted">
                  <Icon className="h-4 w-4 text-faint shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => !isSubmitting && setShowCheckout(false)}
        >
          <div
            className="bg-white w-full sm:rounded-lg shadow-2xl sm:max-w-2xl max-h-[96vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {submitSuccess ? (
              /* ── Success state ── */
              <div className="flex flex-col items-center justify-center p-12 text-center gap-4">
                <div className="h-16 w-16 rounded-full bg-confirmed-wash border border-confirmed/30 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-ink">Order submitted!</h3>
                  <p className="text-sm text-muted mt-1 max-w-xs mx-auto">
                    Our team will verify your payment and grant access within 1–2 business hours.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/dashboard/orders')}
                  className="mt-2 bg-ink text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-ink transition-colors"
                >
                  Track order status
                </button>
              </div>
            ) : (
              <>
                {/* ── Modal header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-rule-soft shrink-0">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-ink">Complete Enrollment</h3>
                    <p className="text-xs text-faint truncate mt-0.5">{course.title}</p>
                  </div>
                  <button
                    onClick={() => setShowCheckout(false)}
                    className="ml-4 h-8 w-8 flex items-center justify-center rounded-lg text-faint hover:text-body hover:bg-rule-soft transition-colors shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* ── Two-column body ── */}
                <div className="flex-1 overflow-y-auto">
                  <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-rule-soft">

                    {/* LEFT — Pay */}
                    <div className="p-6 space-y-5">
                      <div>
                        <p className="text-xs font-semibold text-muted  mb-3">
                          Step 1 — Make Payment
                        </p>

                        {/* Amount pill */}
                        <div className="bg-ink text-white rounded-lg px-5 py-4 mb-5">
                          <p className="text-xs text-white/60 mb-1">Amount to pay</p>
                          <p className="text-3xl font-bold tracking-tight">
                            ₹{finalPrice ?? (course.discountedPrice ?? course.price)}
                          </p>
                          {appliedCoupon && (
                            <p className="text-xs text-emerald-300 mt-1 font-medium">
                              Coupon <span className="font-mono">{appliedCoupon.code}</span> applied — saved ₹{(course.discountedPrice ?? course.price) - (finalPrice ?? 0)}
                            </p>
                          )}
                        </div>

                        {/* QR code */}
                        {paymentSettings?.qrCodeUrl ? (
                          <div className="flex flex-col items-center">
                            <div className="p-2 border border-rule rounded-lg inline-block mb-3">
                              <img
                                src={paymentSettings.qrCodeUrl}
                                alt="UPI QR code"
                                className="h-40 w-40 object-contain rounded-lg"
                              />
                            </div>
                            <p className="text-[11px] text-faint">Scan with any UPI app</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <div className="h-40 w-40 border-2 border-dashed border-rule rounded-lg flex items-center justify-center mb-3">
                              <QrCode className="h-10 w-10 text-faint" />
                            </div>
                            <p className="text-[11px] text-faint">QR code not configured</p>
                          </div>
                        )}
                      </div>

                      {/* UPI ID */}
                      {paymentSettings?.upiId && (
                        <div className="border border-rule rounded-lg p-4">
                          <p className="text-[12px] text-faint font-semibold  mb-1">UPI ID</p>
                          <p className="text-sm font-mono font-bold text-ink">{paymentSettings.upiId}</p>
                          {paymentSettings.upiName && (
                            <p className="text-xs text-muted mt-0.5">{paymentSettings.upiName}</p>
                          )}
                        </div>
                      )}

                      {/* Bank details */}
                      {(paymentSettings?.bankName || paymentSettings?.accountNumber) && (
                        <div className="border border-rule rounded-lg p-4 space-y-2">
                          <p className="text-[12px] text-faint font-semibold ">Bank Transfer</p>
                          {[
                            ['Bank', paymentSettings.bankName],
                            ['Account No.', paymentSettings.accountNumber],
                            ['IFSC', paymentSettings.ifscCode],
                            ['Account Name', paymentSettings.accountHolderName],
                          ].filter(([, v]) => v).map(([label, value]) => (
                            <div key={label} className="flex justify-between text-xs">
                              <span className="text-faint">{label}</span>
                              <span className="font-mono font-semibold text-ink">{value}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Instructions */}
                      {paymentSettings?.additionalInstructions && (
                        <div className="bg-holding-wash border border-holding/30 rounded-lg p-3 text-xs text-amber-800">
                          <span className="font-semibold">Note: </span>
                          {paymentSettings.additionalInstructions}
                        </div>
                      )}
                    </div>

                    {/* RIGHT — Submit proof */}
                    <div className="p-6 space-y-5">
                      <div>
                        <p className="text-xs font-semibold text-muted  mb-3">
                          Step 2 — Submit Proof
                        </p>

                        {/* Order summary */}
                        <div className="border border-rule rounded-lg overflow-hidden mb-5">
                          <div className="flex items-center gap-3 p-3 border-b border-rule-soft">
                            <div className="h-12 w-16 rounded-lg bg-rule-soft overflow-hidden shrink-0">
                              <img
                                src={course.thumbnail || 'https://placehold.co/64x48/041c44/fff?text=MCO'}
                                alt={course.title}
                                className="w-full h-full object-cover"
                                onError={e => { e.currentTarget.src = 'https://placehold.co/64x48/041c44/fff?text=MCO'; }}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-ink line-clamp-2 leading-snug">{course.title}</p>
                              <p className="text-[11px] text-faint mt-0.5">{course.instructorName}</p>
                            </div>
                          </div>
                          <div className="px-3 py-2.5 flex items-center justify-between">
                            <span className="text-xs text-muted">Total</span>
                            <span className="text-sm font-bold text-ink">
                              ₹{finalPrice ?? (course.discountedPrice ?? course.price)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Transaction ID */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-body">
                          Transaction / UTR ID <span className="text-declined">*</span>
                        </label>
                        <input
                          type="text"
                          value={transactionId}
                          onChange={e => setTransactionId(e.target.value)}
                          placeholder="e.g. 426081234567"
                          className="w-full h-10 px-3 rounded-lg border border-rule text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink transition"
                        />
                      </div>

                      {/* The picture itself, not a link to it hosted elsewhere. */}
                      <ImageUpload
                        value={screenshotUrl}
                        onChange={setScreenshotUrl}
                        purpose="payment-screenshot"
                        disabled={isSubmitting}
                        required
                        label="Payment screenshot"
                        hint="The confirmation screen from your UPI or banking app."
                      />

                      {submitError && (
                        <div className="flex items-start gap-2 bg-declined-wash border border-declined/30 rounded-lg p-3">
                          <AlertCircle className="h-3.5 w-3.5 text-declined mt-0.5 shrink-0" />
                          <p className="text-xs text-declined">{submitError}</p>
                        </div>
                      )}

                      <button
                        onClick={handleSubmitOrder}
                        disabled={isSubmitting || !transactionId.trim() || !screenshotUrl.trim()}
                        className="w-full bg-ink hover:bg-ink disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        {isSubmitting
                          ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</>
                          : <><Upload className="h-4 w-4" />Submit for Verification</>
                        }
                      </button>

                      <p className="text-center text-[11px] text-faint">
                        Access is granted after manual payment verification (1–2 hrs).
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
