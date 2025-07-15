import { google } from 'googleapis';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export default async function handler(req, res) {
  try {
    const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

    const {
      GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET,
      GMAIL_REDIRECT_URI,
      GMAIL_REFRESH_TOKEN,
      GMAIL_ACCESS_TOKEN,
      GMAIL_EXPIRY_DATE,
      FIREBASE_SERVICE_ACCOUNT_BASE64,
    } = process.env;

    const oAuth2Client = new google.auth.OAuth2(
      GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET,
      GMAIL_REDIRECT_URI
    );

    oAuth2Client.setCredentials({
      access_token: GMAIL_ACCESS_TOKEN,
      refresh_token: GMAIL_REFRESH_TOKEN,
      scope: SCOPES.join(' '),
      token_type: 'Bearer',
      expiry_date: Number(GMAIL_EXPIRY_DATE),
    });

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    // ✅ INIT FIREBASE ADMIN FROM ENV VAR
    const serviceAccount = JSON.parse(
      Buffer.from(FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
    );

    if (!getApps().length) {
      initializeApp({ credential: cert(serviceAccount) });
    }

    const db = getFirestore();

    const resList = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 5,
    });

    const messages = resList.data.messages || [];
    let created = 0;

    for (const msg of messages) {
      const full = await gmail.users.messages.get({ userId: 'me', id: msg.id });
      const headers = full.data.payload.headers;
      const get = (name) => headers.find((h) => h.name === name)?.value || '';

      const from = get('From');
      const to = get('To');
      const subject = get('Subject');
      const snippet = full.data.snippet || '';

      if (!to.includes('requests@neighboroonie.com')) continue;

      const match = from.match(/<(.+?)>/);
      const senderEmail = match ? match[1] : from;

      const usersSnap = await db
        .collection('users')
        .where('email', '==', senderEmail)
        .get();

      if (usersSnap.empty) continue;

      const userData = usersSnap.docs[0].data();
      const groupIds = userData.groupIds || [];

      for (const groupId of groupIds) {
        await db.collection('requests').add({
          groupId,
          submittedByUid: usersSnap.docs[0].id,
          submittedBy: {
            name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
            email: senderEmail,
          },
          requestText: snippet,
          createdAt: new Date(),
          serviceType: 'internet service provider', // Eventually make dynamic
        });
        created++;
      }
    }

    res.status(200).json({ message: `Created ${created} new request(s)` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
}