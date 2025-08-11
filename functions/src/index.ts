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

      // 🆕 Add a link to the individual request page
      const requestLink = `https://neighboroonie.com/request/${recData.linkedRequestId}`;

      const subject = "New reply to your recommendation request!";
      const emailContent = `
Hi ${requestData.submittedBy?.name || "Neighbor"},

You asked for a recommendation, and ${recData.submittedBy?.name || "someone"} just replied:

"${recData.testimonial}"

Contact Info: ${recData.contactInfo || "N/A"}

See their recommendation here: ${requestLink}

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

  // sendRegquestToFollowedUsers function
exports.sendRequestToFollowedUsers = functions.firestore
  .document("requests/{requestId}")
  .onCreate(async (snap, context) => {
    const requestData = snap.data();
    const requestId = context.params.requestId;

    if (!requestData || !requestData.submittedByUid) {
      console.log("Missing request or user ID.");
      return null;
    }

    const userDoc = await admin.firestore().collection("users").doc(requestData.submittedByUid).get();
    const userData = userDoc.data();
    const followedUids = userData?.following || [];

    if (followedUids.length === 0) {
      console.log("User is not following anyone.");
      return null;
    }

    const requestLink = `https://neighboroonie.com/request/${requestId}`;
    const subject = `${userData?.firstName || "Someone"} asked for a recommendation`;

    const followedUserDocs = await Promise.all(
      followedUids.map((uid: string) => admin.firestore().collection("users").doc(uid).get())
    );


    const emailPromises = followedUserDocs
      .filter(doc => doc.exists)
      .map(doc => {
        const followedUser = doc.data();
        const email = followedUser?.email;
        const name = followedUser?.firstName || "Neighbor";

        if (!userData || !email || email === userData.email) return null;

        const text = `
Hi ${name},

${userData?.firstName || "Someone"} you follow on Neighboroonie just asked for a recommendation:

"${requestData.text}"

You can reply with a recommendation or view the request here:
${requestLink}

—
Don’t want to receive these emails? You can unfollow ${userData?.firstName || "this user"} at any time.
        `.trim();

        return resend.emails.send({
          from: "Neighboroonie <noreply@neighboroonie.com>",
          to: email,
          subject,
          text,
        });
      })
      .filter(Boolean); // remove nulls

    try {
      await Promise.all(emailPromises);
      console.log(`Personalized emails sent to followed users for request ${requestId}`);
    } catch (err) {
      console.error("Error sending emails to followed users:", err);
    }

    return null;
  });

  // send follow notification function
exports.sendFollowNotification = functions.firestore
  .document("follows/{followId}")
  .onCreate(async (snap, context) => {
    const follow = snap.data();
    const followerId = follow.followerId;
    const followedId = follow.followingId;

    const followerSnap = await admin.firestore().collection("users").doc(followerId).get();
    const followedSnap = await admin.firestore().collection("users").doc(followedId).get();

    const followerData = followerSnap.data();
    const followedData = followedSnap.data();

    if (!followedData?.email) {
      console.log("No email on followed user. Skipping.");
      return null;
    }

    const subject = `${followerData?.firstName || "Someone"} just followed you on Neighboroonie!`;
    const text = `
Hi ${followedData.firstName || "Neighbor"},

${followerData?.firstName || "Someone"} just started following you on Neighboroonie.

You can check out their recommendations and requests, and follow them back here:
https://neighboroonie.com/users/${followerId}

— Neighboroonie
    `.trim();

    try {
      await resend.emails.send({
        from: "Neighboroonie <noreply@neighboroonie.com>",
        to: followedData.email,
        subject,
        text,
      });

      console.log(`Follow email sent to ${followedData.email}`);
    } catch (err) {
      console.error("Error sending follow email:", err);
    }

    return null;
  });


// 📣 Email group when a new request is posted
export const sendNewRequestEmail = functions.firestore
  .document("requests/{requestId}")
  .onCreate(async (snap, context) => {
    const request = snap.data();
    const { groupId, text, serviceType, submittedBy } = request;
    const requestId = context.params.requestId;

    if (!groupId || !submittedBy?.email) return null;

    const requestLink = `https://neighboroonie.com/request/${requestId}`;
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      const groupUsersSnap = await admin
        .firestore()
        .collection("users")
        .where("groupIds", "array-contains", groupId)
        .get();

      const recipientDocs = groupUsersSnap.docs.filter((doc) => {
        const user = doc.data();
        return (
          user.email &&
          user.email !== submittedBy.email &&
          !user.emailOptOut
        );
      });

      if (recipientDocs.length === 0) {
        console.log("No eligible recipients for new request email.");
        return null;
      }

      for (const doc of recipientDocs) {
        const email = doc.data().email;
        await delay(600); // throttle for Resend rate limits

        await resend.emails.send({
          from: "Neighboroonie <noreply@neighboroonie.com>",
          to: email,
          subject: `New request in your Neighboroonie group: ${groupId}`,
          html: `
            <p><strong>${submittedBy.name}</strong> asked for a recommendation in <strong>${groupId}</strong>.</p>
            <p><em>Category:</em> ${serviceType}</p>
            <p><em>Request:</em> ${text}</p>
            <p><a href="${requestLink}">View the request →</a></p>
            <hr />
            <p style="font-size: 12px; color: #888;">
              You can manage your email preferences <a href="https://neighboroonie.com/settings" style="color: #555;">here</a>.
            </p>
          `,
        });

        console.log(`Sent request email to ${email}`);
      }
    } catch (err) {
      console.error("Error sending group request emails:", err);
    }



    return null;
  });
  // 📬 Email on new group request
exports.sendGroupRequestEmail = functions.firestore
  .document("groupRequests/{requestId}")
  .onCreate(async (snap) => {
    const request = snap.data();
    const email = "ctwebnet@gmail.com";

    const subject = `New Neighboroonie Group Request: ${request.location}`;
    const text = `
📍 Location: ${request.location}
📝 Notes: ${request.notes || "None provided"}
👤 Name: ${request.submittedBy?.name || "Unknown"}
✉️ Email: ${request.submittedBy?.email || "Unknown"}
🕒 Submitted: ${new Date().toLocaleString()}
`;

    try {
      await resend.emails.send({
        from: "Neighboroonie <noreply@neighboroonie.com>",
        to: email,
        subject,
        text,
      });
      console.log(`Group request email sent to ${email}`);
    } catch (err) {
      console.error("Error sending group request email:", err);
    }
  return null;
  });
 // 💌 Email when someone thanks a recommendation
exports.sendThankYouEmail = functions.firestore
  .document("recommendations/{recId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    const prevThanks = before.thanks || {};
    const newThanks = after.thanks || {};

    const newUserIds = Object.keys(newThanks).filter(
      (uid) => !prevThanks[uid]
    );

    if (newUserIds.length === 0) {
      console.log("No new thanks added. Skipping.");
      return null;
    }

    const recOwnerEmail = after?.submittedBy?.email;
    const recOwnerName = after?.submittedBy?.name || "Neighbor";
    const recName = after?.name;

    if (!recOwnerEmail) {
      console.log("No recipient email found on recommendation.");
      return null;
    }

    // 🔍 Check opt-out status
    const userSnap = await admin
      .firestore()
      .collection("users")
      .where("email", "==", recOwnerEmail)
      .limit(1)
      .get();

    const userData = userSnap.docs[0]?.data();
    if (userData?.thankYouEmailOptOut) {
      console.log(`User ${recOwnerEmail} has opted out of thank-you emails.`);
      return null;
    }

    // 👤 Who thanked them
    const newUserSnap = await admin
      .firestore()
      .collection("users")
      .doc(newUserIds[0])
      .get();
    const newUserName = newUserSnap.exists
      ? newUserSnap.data()?.firstName || "Someone"
      : "Someone";

    const subject = `${newUserName} appreciated your recommendation!`;
    const body = `
Hi ${recOwnerName},

${newUserName} just thanked you for your recommendation of "${recName}". 🙌

Your local knowledge is helping others — thanks for sharing it!

Want to help again? Add more recommendations here:
https://neighboroonie.com/my-list

––––––––––––––––––––––––––––––––––––
You can manage your email preferences here: https://neighboroonie.com/settings
    `;

    try {
      await resend.emails.send({
        from: "Neighboroonie <noreply@neighboroonie.com>",
        to: recOwnerEmail,
        subject,
        text: body.trim(),
      });
      console.log(`Thank-you email sent to ${recOwnerEmail}`);
    } catch (err) {
      console.error("Error sending thank-you email:", err);
    }

    return null;
  });
  
// 📅 Weekly digest email with recent recommendations
exports.sendWeeklyDigest = functions
  .runWith({ timeoutSeconds: 300, memory: "512MB" }) // keep the larger budget
  .pubsub.schedule("every monday 9:00")
  .timeZone("America/New_York")
  .onRun(async () => {
    const oneWeekAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    // 🔢 overall counters
    let overall = { eligible: 0, skipped: 0, sent: 0, errors: 0, groups: 0 };

    const recSnap = await admin
      .firestore()
      .collection("recommendations")
      .where("createdAt", ">=", oneWeekAgo)
      .get();

    const recsByGroup: Record<string, any[]> = {};
    recSnap.forEach((doc) => {
      const rec = { id: doc.id, ...doc.data() } as any;
      if (!recsByGroup[rec.groupId]) recsByGroup[rec.groupId] = [];
      recsByGroup[rec.groupId].push(rec);
    });

    for (const groupId of Object.keys(recsByGroup)) {
      const recs = recsByGroup[groupId];
      if (recs.length === 0) continue;

      overall.groups += 1;

      // 🔢 per‑group counters
      let groupCounts = { eligible: 0, skipped: 0, sent: 0, errors: 0 };

      const usersSnap = await admin
        .firestore()
        .collection("users")
        .where("groupIds", "array-contains", groupId)
        .get();

      const eligibleUsers = usersSnap.docs.filter((doc) => {
        const u = doc.data();
        return u.email && !u.weeklyDigestOptOut;
      });

      if (eligibleUsers.length === 0) continue;

      const firstRec = recs[0];
      const recommenderName = firstRec.submittedBy?.name || "Someone";
      const subject = `${recommenderName} and others shared new recs in ${groupId}`;

      const listItems = recs.map(
        (r) => `
<li>
  <strong>${r.name || "Unnamed"}</strong> — ${r.testimonial?.slice(0, 100) || "No testimonial"}...
  <br />
  <a href="https://neighboroonie.com/recommendations/${r.id}">
    View full recommendation →
  </a>
</li>`
      );

      const html = `
<p>Here are new recommendations shared in your Neighboroonie group <strong>${groupId}</strong> this week:</p>
<ul>${listItems.join("")}</ul>
<p><a href="https://neighboroonie.com/${groupId}">See all group activity →</a></p>
<p>Want to help others in your community?</p>
<p><a href="https://neighboroonie.com/my-list">Add your own recommendations →</a></p>
<hr />
<p style="font-size: 12px; color: #888;">
  You can manage your email preferences <a href="https://neighboroonie.com/settings" style="color: #555;">here</a>.
</p>`;

      const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

      for (const userDoc of eligibleUsers) {
        const email = userDoc.data().email as string;
        const userId = userDoc.id;
        groupCounts.eligible += 1;
        overall.eligible += 1;

        // ✅ idempotency key (same as you added)
        const weekKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (Mon)
        const logId = `${userId}_${groupId}_${weekKey}`;
        const logRef = admin.firestore().collection("weeklyDigestLog").doc(logId);
        const already = await logRef.get();
        if (already.exists) {
          groupCounts.skipped += 1;
          overall.skipped += 1;
          continue;
        }

        await delay(600); // Resend throttle

        try {
          await resend.emails.send({
            from: "Neighboroonie <noreply@neighboroonie.com>",
            to: email,
            subject,
            html,
          });
          await logRef.set({
            userId,
            groupId,
            weekKey,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            email,
          });

          groupCounts.sent += 1;
          overall.sent += 1;
          console.log(`📬 Sent digest to ${email} (group: ${groupId})`);
        } catch (err) {
          groupCounts.errors += 1;
          overall.errors += 1;
          console.error(`Error sending digest to ${email} (group: ${groupId}):`, err);
        }
      }

      // 🧾 per‑group summary
      console.log(
        `Digest summary for ${groupId}: eligible=${groupCounts.eligible}, skipped=${groupCounts.skipped}, sent=${groupCounts.sent}, errors=${groupCounts.errors}`
      );
    }

    // 🧮 overall summary
    console.log(
      `WeeklyDigest overall: groups=${overall.groups}, eligible=${overall.eligible}, skipped=${overall.skipped}, sent=${overall.sent}, errors=${overall.errors}`
    );

    return null;
  });