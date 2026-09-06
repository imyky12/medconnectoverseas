import { Request, Response } from 'express';
import { User } from '../../models/User.model';
import { Referral } from '../../models/Referral.model';
import { createOtp, verifyOtp } from '../../services/otp.service';
import { sendOtpSms } from '../../services/sms.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { notifyWelcome, notifyReferralSignup } from '../../services/email/notifications';
import { normalizeMobile, isPlausibleMobile } from '../../utils/phone';

/**
 * Handles requesting an OTP for mobile verification during onboarding.
 */
export const requestMobileOtp = asyncHandler(async (req: Request, res: Response) => {
  const { mobile, countryCode } = req.body;

  if (!mobile || !countryCode) {
    throw new ApiError(400, 'Mobile number and country code are required');
  }

  // Everything downstream — the OTP identifier, the uniqueness check, the row
  // we eventually store — uses the same canonical E.164 string, so a client
  // that sends "+919820115577" and one that sends "9820115577" with "+91"
  // resolve to the same number instead of two different accounts.
  const normalizedMobile = normalizeMobile(mobile, countryCode);
  if (!isPlausibleMobile(normalizedMobile)) {
    throw new ApiError(400, 'That does not look like a valid mobile number.');
  }

  // Prevent sending OTP to a mobile number already officially registered & verified by someone else
  const existingUser = await User.findOne({ mobile: normalizedMobile, isMobileVerified: true });
  if (existingUser && existingUser._id.toString() !== req.user?.userId) {
     throw new ApiError(400, 'Mobile number is already registered to another account.');
  }

  const otpValue = await createOtp(normalizedMobile, 'sms');
  await sendOtpSms(normalizedMobile, otpValue);

  res.status(200).json(new ApiResponse(200, null, 'OTP sent successfully to your mobile number.'));
});

/**
 * Generate a unique referral code. Tries `base` first, then increments.
 */
const generateUniqueReferralCode = async (mobile: string): Promise<string> => {
  // Use last 4 digits (or fallback to full mobile if less than 4 digits)
  const baseVal = mobile.length >= 4 ? mobile.slice(-4) : mobile;
  let codeStr = baseVal;
  let counter = 0;

  while (true) {
    const codeToCheck = counter === 0 ? codeStr : (parseInt(codeStr) + counter).toString();
    const existing = await User.findOne({ referralCode: codeToCheck });
    
    if (!existing) {
      return codeToCheck;
    }
    counter++;
  }
};

/**
 * Onboarding controller taking full details and validating the phone OTP inline.
 */
export const onboarding = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, country, mobile, countryCode, howDidYouHearAboutUs, otp, referredByCode } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  if (!firstName || !lastName || !country || !mobile || !countryCode || !otp) {
    throw new ApiError(400, 'All fields including OTP are required to complete onboarding');
  }

  // 1. Verify Mobile OTP — against the same canonical number the OTP was
  // issued to, so a client that formats the number differently between the two
  // calls does not fail verification for a code that is actually correct.
  const normalizedMobile = normalizeMobile(mobile, countryCode);
  if (!isPlausibleMobile(normalizedMobile)) {
    throw new ApiError(400, 'That does not look like a valid mobile number.');
  }

  const isOtpValid = await verifyOtp(normalizedMobile, 'sms', otp);
  if (!isOtpValid) {
    throw new ApiError(400, 'Invalid or expired OTP for mobile number');
  }

  // 2. Fetch User
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // 3. Ensure they aren't fully completed already
  if (user.isOnboardingComplete) {
    throw new ApiError(400, 'Onboarding is already complete');
  }

  // 4. Generate unique referral code
  const referralCode = await generateUniqueReferralCode(normalizedMobile);

  // 5. Resolve referrer if a referral code was provided.
  //
  // A code that does not resolve used to be dropped in silence while the screen
  // still said "Code applied" — the user believed a friend had been credited and
  // that they had a discount, and nothing ever told them otherwise. The client
  // now checks the code the moment it is typed, but the truth is reported here
  // too, so a code can never be discarded without the caller being told.
  //
  // It is reported rather than thrown on purpose: the mobile OTP has already
  // been consumed by this point, so failing the request would strand the user at
  // the last step of onboarding with no way to retry.
  let referrer: InstanceType<typeof User> | null = null;
  let referralOutcome: { applied: boolean; code?: string; reason?: string } = { applied: false };

  const submittedCode = typeof referredByCode === 'string' ? referredByCode.trim().toUpperCase() : '';
  if (submittedCode) {
    referrer = await User.findOne({ referralCode: submittedCode });
    if (!referrer) {
      referralOutcome = { applied: false, code: submittedCode, reason: 'We could not find that referral code, so no one was credited for your signup.' };
    } else if (referrer._id.toString() === userId) {
      referrer = null;
      referralOutcome = { applied: false, code: submittedCode, reason: 'That is your own referral code — you cannot refer yourself.' };
    } else {
      referralOutcome = { applied: true, code: submittedCode };
    }
  }

  // 6. Update user
  user.firstName = firstName.trim();
  user.lastName = lastName.trim();
  user.country = country.trim();
  // Stored E.164 and complete on its own — nothing should ever prefix it with
  // `countryCode` again. `countryCode` is kept because knowing the country is
  // useful, not because the number is missing it.
  user.mobile = normalizedMobile;
  user.countryCode = countryCode.trim();
  user.howDidYouHearAboutUs = howDidYouHearAboutUs ? howDidYouHearAboutUs.trim() : undefined;

  user.isMobileVerified = true;
  user.isOnboardingComplete = true;
  user.referralCode = referralCode;
  if (referrer) user.referredBy = referrer._id as any;

  await user.save();

  // 7. Create referral record
  if (referrer) {
    await Referral.create({
      referrerId: referrer._id,
      referredId: user._id,
      referralCode: submittedCode,
      status: 'pending',
    });
  }

  // 8. Welcome the new member, and tell the referrer someone used their code.
  // Fire-and-forget — onboarding must not fail because of email.
  void notifyWelcome(user);

  if (referrer) {
    const referredCount = await Referral.countDocuments({ referrerId: referrer._id });
    const newMemberName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    void notifyReferralSignup(referrer, newMemberName, referredCount);
  }

  res.status(200).json(
    new ApiResponse(200, {
      user: {
        id: user._id,
        email: user.email,
        isOnboardingComplete: user.isOnboardingComplete,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        referralCode: user.referralCode,
      },
      referral: referralOutcome,
    }, 'Onboarding completed successfully')
  );
});
