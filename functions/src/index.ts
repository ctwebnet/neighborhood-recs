import * as functions from 'firebase-functions'; // ✅ v1-compatible
import * as admin from 'firebase-admin';
import { Resend } from 'resend';

admin.initializeApp();
const resend = new Resend(functions.config().resend.key);

export const sendFeedbackEmail = functions.firestore
  .document('feedback/{feedbackId}')
  .onCreate(
    async (
      snap: functions.firestore.DocumentSnapshot,
      context: functions.EventContext
    ) => {
      const data = snap.data();

      if (!data?.message || !data?.email) {
        console.warn('Missing message or email in feedback submission.');
        return null;
      }

      try {
        await resend.emails.send({
          from: 'feedback@resend.dev', // Safe, spoof-free test sender
          to: ['ctwebnet@gmail.com'],  // Your test inbox
          subject: '📝 New Feedback Submitted',
          text: `
New feedback received:

From: ${data.email}
Message:
${data.message}

— Neighboroonie
          `.trim(),
        });

        console.log('✅ Email sent!');
      } catch (error) {
        console.error('❌ Failed to send email:', error);
      }

      return null;
    }
  );
