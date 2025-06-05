import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Resend } from "resend";

admin.initializeApp();

const resend = new Resend(functions.config().resend.key);

// 🔥 Existing sendFeedbackEmail function
exports.sendFeedbackEmail = functions.firestore
  .document("feedback/{feedbackId}")
  .onCreate(async (snap, context) => {
    const feedback = snap.data();
    const email = "ctwebnet@gmail.com"; // Replace with your email

    const subject = `New feedback from ${feedback.email || "Anonymous"}`;
    const text = feedback.message || "No message provided.";

    try {
      await resend.emails.send({
        from: "Neighboroonie <noreply@neighboroonie.com>",
        to: email,
        subject,
        text,
      });
      console.log(`Feedback email sent to ${email}`);
    } catch (err) {
      console.error("Error sending feedback email:", err);
    }
  });

// ✨ New sendReplyEmail function
exports.sendReplyEmail = functions.firestore
  .document("recommendations/{recId}")
  .onCreate(async (snap, context) => {
    const recData = snap.data();

    if (!recData.linkedRequestId) {
      console.log("Recommendation is not linked to a request. Skipping email.");
      return null;
    }

    try {
      const requestSnap = await admin
        .firestore()
        .collection("requests")
        .doc(recData.linkedRequestId)
        .get();

      if (!requestSnap.exists) {
        console.log("No parent request found. Skipping email.");
        return null;
      }

      const requestData = requestSnap.data();
      const recipientEmail = requestData?.submittedBy?.email;

      if (!recipientEmail) {
        console.log("No recipient email found. Skipping email.");
        return null;
      }

      const subject = "New reply to your recommendation request!";
      const emailContent = `
Hi ${requestData.submittedBy?.name || "Neighbor"},

You asked for a recommendation, and ${recData.submittedBy?.name || "someone"} just replied:

"${recData.testimonial}"

Contact Info: ${recData.contactInfo || "N/A"}

Log in to Neighboroonie to see more details!

Cheers,
The Neighboroonie Team
      `;

      await resend.emails.send({
        from: "Neighboroonie <noreply@neighboroonie.com>",
        to: recipientEmail,
        subject,
        text: emailContent.trim(),
      });

      console.log(`Email sent to ${recipientEmail}`);
    } catch (err) {
      console.error("Error sending reply email:", err);
    }

    return null;
  });
