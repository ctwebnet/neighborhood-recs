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
          subject: `${
  submittedBy?.firstName || submittedBy?.name || "Someone"
} just asked for a ${serviceType || "local"} recommendation in ${groupId}`,
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
  });// 📅 Weekly digest email with recent recommendations (no unanswered requests)
exports.sendWeeklyDigest = functions
  .runWith({ timeoutSeconds: 300, memory: "512MB" })
  .pubsub.schedule("every monday 9:00")
  .timeZone("America/New_York")
  .onRun(async () => {
    const oneWeekAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    // overall counters (logging only)
    let overall = { eligible: 0, skipped: 0, sent: 0, errors: 0, groups: 0 };

    // recent recs (this week) grouped by groupId (no composite index needed here)
    const recSnap = await admin
      .firestore()
      .collection("recommendations")
      .where("createdAt", ">=", oneWeekAgo)
      .get();

    const recsByGroup: Record<string, any[]> = {};
    recSnap.forEach((doc) => {
      const rec = { id: doc.id, ...doc.data() } as any;
      if (!rec.groupId) return;
      if (!recsByGroup[rec.groupId]) recsByGroup[rec.groupId] = [];
      recsByGroup[rec.groupId].push(rec);
    });

    // helper
    const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

    for (const groupId of Object.keys(recsByGroup)) {
      const recs = recsByGroup[groupId] || [];
      if (recs.length === 0) continue;

      overall.groups += 1;

      // per‑group counters (logging only)
      let groupCounts = { eligible: 0, skipped: 0, sent: 0, errors: 0 };

      // Pull group members
      const usersSnap = await admin
        .firestore()
        .collection("users")
        .where("groupIds", "array-contains", groupId)
        .get();

      const eligibleUsers = usersSnap.docs.filter((doc) => {
        const u = doc.data() as any;
        return u.email && !u.weeklyDigestOptOut;
      });

      if (eligibleUsers.length === 0) continue;

      // SUBJECT
      const firstRec = recs[0];
      const recommenderName = firstRec?.submittedBy?.name || "Someone";
      const subject = `${recommenderName} and others shared new recs in ${groupId}`;

      // “New this week” list
      const listItems = recs.map(
        (r: any) => `
<li>
  <strong>${r.name || "Unnamed"}</strong> — ${r.testimonial?.slice(0, 100) || "No testimonial"}...
  <br />
  <a href="https://neighboroonie.com/recommendations/${r.id}">
    View full recommendation →
  </a>
</li>`
      );

      // 👋 small prompt to encourage requests
      const topNudge = `
<p style="margin:0 0 12px 0;">
  <strong>Need something?</strong> Ask your neighbors — your request goes to members of <strong>${groupId}</strong>.
  <br />
  <a href="https://neighboroonie.com/${encodeURIComponent(groupId)}">Start a request →</a>
</p>`;

      // EMAIL HTML
      const html = `
${topNudge}
<p>Here are new recommendations shared in your Neighboroonie group <strong>${groupId}</strong> this week:</p>
<ul>${listItems.join("") || "<li>No new recommendations this week.</li>"}</ul>
<p><a href="https://neighboroonie.com/${encodeURIComponent(groupId)}">See all group activity →</a></p>
<p>Want to help others in your community?</p>
<p><a href="https://neighboroonie.com/my-list">Add your own recommendations →</a></p>
<hr />
<p style="font-size: 12px; color: #888;">
  You can manage your email preferences <a href="https://neighboroonie.com/settings" style="color: #555;">here</a>.
</p>`;

      // send loop (idempotent per user+group+week)
      for (const userDoc of eligibleUsers) {
        const email = (userDoc.data() as any).email as string;
        const userId = userDoc.id;
        groupCounts.eligible += 1;
        overall.eligible += 1;

        const weekKey = new Date().toISOString().slice(0, 10);
        const logId = `${userId}_${groupId}_${weekKey}`;
        const logRef = admin.firestore().collection("weeklyDigestLog").doc(logId);
        const already = await logRef.get();
        if (already.exists) {
          groupCounts.skipped += 1;
          overall.skipped += 1;
          continue;
        }

        await delay(600); // keep conservative throttle (Resend)

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

      console.log(
        `Digest summary for ${groupId}: eligible=${groupCounts.eligible}, skipped=${groupCounts.skipped}, sent=${groupCounts.sent}, errors=${groupCounts.errors}`
      );
    }

    console.log(
      `WeeklyDigest overall: groups=${overall.groups}, eligible=${overall.eligible}, skipped=${overall.skipped}, sent=${overall.sent}, errors=${overall.errors}`
    );

    return null;
  });// 🔎 Preview: send one digest email for a specific group to a specific address
exports.sendWeeklyDigestPreview = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    // Robust body parsing (handles JSON and rawBody)
    const getBody = () => {
      if (req.body && Object.keys(req.body).length) return req.body;
      try {
        if ((req as any).rawBody) return JSON.parse((req as any).rawBody.toString("utf8"));
      } catch {}
      try {
        if (typeof req.body === "string") return JSON.parse(req.body);
      } catch {}
      return {};
    };

    const { groupId, emailOverride } = getBody() as {
      groupId?: string;
      emailOverride?: string;
    };

    if (!groupId || !emailOverride) {
      console.warn({ groupId, emailOverride, message: "Request body is missing data." });
      res.status(400).json({ error: "Missing groupId and/or emailOverride" });
      return;
    }

    const oneWeekAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    // ⚠️ To avoid a composite index, query by groupId only, then filter by date in code.
    const recSnap = await admin
      .firestore()
      .collection("recommendations")
      .where("groupId", "==", groupId)
      .get();

    const allInGroup = recSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
    const recs = allInGroup.filter((r) => {
      const ts = (r.createdAt && (r.createdAt.toDate?.() || r.createdAt)) as Date | undefined;
      return ts ? ts.getTime() >= oneWeekAgo.toDate().getTime() : false;
    });

    const firstRec = recs[0];
    const recommenderName = firstRec?.submittedBy?.name || "Neighbors";
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

    // 👋 small prompt to encourage requests
    const topNudge = `
<p style="margin:0 0 12px 0;">
  <strong>Need something?</strong> Ask your neighbors — your request goes to members of <strong>${groupId}</strong>.
  <br />
  <a href="https://neighboroonie.com/${encodeURIComponent(groupId)}">Start a request →</a>
</p>`;

    const html = `
${topNudge}
<p>Here are new recommendations shared in your Neighboroonie group <strong>${groupId}</strong> this week:</p>
<ul>${listItems.join("") || "<li>No new recommendations this week.</li>"}</ul>
<p><a href="https://neighboroonie.com/${encodeURIComponent(groupId)}">See all group activity →</a></p>
<p>Want to help others in your community?</p>
<p><a href="https://neighboroonie.com/my-list">Add your own recommendations →</a></p>
<hr />
<p style="font-size: 12px; color: #888;">
  You can manage your email preferences <a href="https://neighboroonie.com/settings" style="color: #555;">here</a>.
</p>`;

    await resend.emails.send({
      from: "Neighboroonie <noreply@neighboroonie.com>",
      to: emailOverride,
      subject,
      html,
    });

    console.log(`(Preview) Sent digest to ${emailOverride} for group ${groupId}`);
    res.status(200).json({ ok: true });
    return;
  } catch (err) {
    console.error("sendWeeklyDigestPreview error:", err);
    res.status(500).send("Internal error");
    return;
  }
});

// Preview: send all *unanswered* requests for a group to a single address (you)
exports.sendUnansweredPreview = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    // ---- body parsing (handles rawBody / string) ----
    const getBody = () => {
      if (req.body && Object.keys(req.body).length) return req.body;
      try {
        if ((req as any).rawBody) return JSON.parse((req as any).rawBody.toString("utf8"));
      } catch {}
      try {
        if (typeof req.body === "string") return JSON.parse(req.body);
      } catch {}
      return {};
    };
    const { groupId, emailOverride } = getBody() as {
      groupId?: string;
      emailOverride?: string;
    };

    if (!groupId) {
      res.status(400).json({ error: "Missing groupId" });
      return;
    }

    // Send to you by default (preview)
    const toEmail = emailOverride || "ctwebnet@gmail.com";

    // ---- CONFIG: how far back to look for unanswered requests ----
    const windowDays = 60; // change to 365 (or remove filter) if you want all-time
    const since = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
    );

    // 1) Pull recent requests in this group
    let q = admin.firestore().collection("requests").where("groupId", "==", groupId);
    if (windowDays > 0) q = q.where("createdAt", ">=", since);
    const reqSnap = await q.get();

    if (reqSnap.empty) {
      await resend.emails.send({
        from: "Neighboroonie <noreply@neighboroonie.com>",
        to: toEmail,
        subject: `Open requests in ${groupId}`,
        html: `
<p>No requests found in the last ${windowDays} days for <strong>${groupId}</strong>.</p>
<p><a href="https://neighboroonie.com/${encodeURIComponent(groupId)}">Go to your group →</a></p>
        `.trim(),
      });
      res.json({ ok: true, message: "No requests found" });
      return;
    }

    // 2) For each request, check if it has any recommendations (linkedRequestId)
    const requests = reqSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

    // We’ll do batched checks to avoid composite indexes
    const unanswered: any[] = [];
    for (const r of requests) {
      const replies = await admin
        .firestore()
        .collection("recommendations")
        .where("linkedRequestId", "==", r.id)
        .limit(1)
        .get();
      if (replies.empty) unanswered.push(r);
    }

    // 3) Build the email
    const subject = `Open requests in ${groupId} (${unanswered.length})`;
    const items = unanswered.map((rq) => {
      const text = (rq.text || "").toString();
      const short = text.length > 160 ? `${text.slice(0, 160)}…` : text;
      return `
<li style="margin-bottom:8px;">
  <em>${short || "Someone asked for a recommendation"}</em>
  <br/>
  <a href="https://neighboroonie.com/request/${rq.id}">Add a recommendation →</a>
</li>`;
    });

    const html = `
<p>Here are <strong>${unanswered.length}</strong> open requests from your Neighboroonie group <strong>${groupId}</strong>${
      windowDays ? ` in the last ${windowDays} days` : ""
    }:</p>

${
  unanswered.length
    ? `<ul>${items.join("")}</ul>`
    : `<p><em>Nice! There are no unanswered requests right now.</em></p>`
}

<hr />
<p style="font-size: 12px; color: #888;">
  Preview sent to ${toEmail}. <a href="https://neighboroonie.com/${encodeURIComponent(
      groupId
    )}">See all group activity →</a>
</p>
`.trim();

    await resend.emails.send({
      from: "Neighboroonie <noreply@neighboroonie.com>",
      to: toEmail,
      subject,
      html,
    });

    console.log(`(Preview) Sent UNANSWERED digest to ${toEmail} for group ${groupId} — ${unanswered.length} items`);
    res.json({ ok: true, count: unanswered.length });
  } catch (err) {
    console.error("sendUnansweredPreview error:", err);
    res.status(500).send("Internal error");
  }
});
// 📬 Weekly unanswered-requests digest (7 days, no composite indexes)
exports.sendUnansweredWeeklyDigest = functions
  .runWith({ timeoutSeconds: 300, memory: "512MB" })
  .pubsub.schedule("every tuesday 9:10") // tweak day/time as you like
  .timeZone("America/New_York")
  .onRun(async () => {
    const db = admin.firestore();
    const oneWeekAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    // Pull requests from last 7 days (single-field index only)
    const reqSnap = await db
      .collection("requests")
      .where("createdAt", ">=", oneWeekAgo)
      .get();

    if (reqSnap.empty) {
      console.log("No requests this week; nothing to send.");
      return null;
    }

    // Group by groupId
    const byGroup: Record<string, any[]> = {};
    reqSnap.forEach((d) => {
      const rq = { id: d.id, ...d.data() } as any;
      if (!rq.groupId) return;
      (byGroup[rq.groupId] ||= []).push(rq);
    });

    const chunk = <T,>(arr: T[], size = 10) => {
      const out: T[][] = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    };
    const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

    let overall = { groups: 0, eligible: 0, skipped: 0, sent: 0, errors: 0 };

    for (const groupId of Object.keys(byGroup)) {
      const groupReqs = byGroup[groupId] || [];

      // Determine unanswered via 'in' on linkedRequestId (no composite needed)
      const ids = groupReqs.map((r) => r.id);
      const idChunks = chunk(ids, 10);

      const answered = new Set<string>();
      const recQueries = idChunks.map((c) =>
        db
          .collection("recommendations")
          .where("linkedRequestId", "in", c)
          .select("linkedRequestId")
          .get()
      );
      const recResults = await Promise.all(recQueries);
      recResults.forEach((snap) =>
        snap.forEach((doc) => {
          const x = doc.data() as any;
          if (x?.linkedRequestId) answered.add(x.linkedRequestId);
        })
      );

      const unanswered = groupReqs
        .filter((rq) => !answered.has(rq.id))
        .sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
        )
        .slice(0, 12);

      if (unanswered.length === 0) {
        console.log(`Group ${groupId}: no unanswered this week; skipping.`);
        continue;
      }

      overall.groups += 1;

      // Recipients (reuse weeklyDigestOptOut)
      const usersSnap = await db
        .collection("users")
        .where("groupIds", "array-contains", groupId)
        .get();

      const recipients = usersSnap.docs.filter((u) => {
        const d = u.data() as any;
        return d.email && !d.weeklyDigestOptOut;
      });
      if (recipients.length === 0) continue;

      const subject = `Unanswered Requests For Recommendations This Week ${groupId}`;
      const listItems = unanswered.map(
        (rq) => `
<li>
  <em>${(rq.text || "").toString().slice(0, 160)}${
          (rq.text || "").length > 160 ? "…" : ""
        }</em>
  <br />
  <a href="https://neighboroonie.com/request/${rq.id}">
    Add a recommendation →
  </a>
</li>`
      );

      const html = `
<p>A few neighbors in <strong>${groupId}</strong> are waiting on a local recommendation:</p>
<ul>${listItems.join("")}</ul>
<p><a href="https://neighboroonie.com/${encodeURIComponent(
        groupId
      )}">See all group activity →</a></p>
<p>Have a need of your own?</p>
<p><a href="https://neighboroonie.com/my-list">Ask your neighbors (it can help you and help build the local knowledge base) →</a></p>
<hr />
<p style="font-size:12px;color:#888;">
  You can manage your email preferences <a href="https://neighboroonie.com/settings" style="color:#555;">here</a>.
</p>`.trim();

      // Idempotency: separate log from the recs digest
      const weekKey = new Date().toISOString().slice(0, 10);
      let groupCounts = { eligible: 0, sent: 0, skipped: 0, errors: 0 };

      for (const userDoc of recipients) {
        const email = (userDoc.data() as any).email as string;
        const userId = userDoc.id;
        groupCounts.eligible += 1;
        overall.eligible += 1;

        const logId = `${userId}_${groupId}_${weekKey}_unanswered`;
        const logRef = db.collection("unansweredDigestLog").doc(logId);
        const already = await logRef.get();
        if (already.exists) {
          groupCounts.skipped += 1;
          overall.skipped += 1;
          continue;
        }

        await delay(500); // stay friendly to Resend

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
            type: "unanswered",
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            email,
          });

          groupCounts.sent += 1;
          overall.sent += 1;
          console.log(`📬 Unanswered digest -> ${email} (${groupId})`);
        } catch (err) {
          groupCounts.errors += 1;
          overall.errors += 1;
          console.error(`Error emailing ${email} (${groupId}):`, err);
        }
      }

      console.log(
        `Unanswered summary ${groupId}: eligible=${groupCounts.eligible}, sent=${groupCounts.sent}, skipped=${groupCounts.skipped}, errors=${groupCounts.errors}`
      );
    }

    console.log(
      `Unanswered overall: groups=${overall.groups}, eligible=${overall.eligible}, sent=${overall.sent}, skipped=${overall.skipped}, errors=${overall.errors}`
    );

    return null;
  });