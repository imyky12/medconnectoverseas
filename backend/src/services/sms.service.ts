/**
 * Dummy SMS sending service for testing purposes.
 * Logs the SMS content directly to the console instead of relying on a real provider.
 *
 * It takes one already-canonical E.164 number. It used to take the number and a
 * country code and join them, which printed "+91+919820115577" because the
 * number already carried its dial code — see `utils/phone.ts`.
 */

export const sendOtpSms = async (mobile: string, otp: string): Promise<void> => {
  console.log('----------------------------------------------------');
  console.log(`📱 SMS SENT TO: ${mobile}`);
  console.log(`MESSAGE: MedConnects Overseas Verification Code: ${otp}. Valid for 5 minutes.`);
  console.log('----------------------------------------------------');
};
