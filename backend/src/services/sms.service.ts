/**
 * Dummy SMS sending service for testing purposes.
 * Logs the SMS content directly to the console instead of relying on a real provider.
 */

export const sendOtpSms = async (mobile: string, countryCode: string, otp: string): Promise<void> => {
  console.log('----------------------------------------------------');
  console.log(`📱 SMS SENT TO: ${countryCode}${mobile}`);
  console.log(`MESSAGE: MedConnects Overseas Verification Code: ${otp}. Valid for 5 minutes.`);
  console.log('----------------------------------------------------');
};

