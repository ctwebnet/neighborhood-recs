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

    const serviceAccount = JSON.parse(
      Buffer.from(FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
    );

    if (!getApps().length) {
      initializeApp({ credential: cert(serviceAccount) });
    }

    const db = getFirestore();

    const serviceTypesSnap = await db.collection('serviceTypes').get();
    const serviceTypes = serviceTypesSnap.docs.map((doc) => doc.data().name.toLowerCase());

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
      if (!to.includes('requests@neighboroonie.com')) continue;

      const match = from.match(/<(.+?)>/);
      const senderEmail = match ? match[1] : from;

      const usersSnap = await db
        .collection('users')
        .where('email', '==', senderEmail)
        .get();

      if (usersSnap.empty) continue;

      // Extract text/plain body
      let body = '';
      const parts = full.data.payload.parts || [];
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8').trim();
          break;
        }
      }

      const fallbackText = full.data.snippet?.trim() || '(No content)';
      const requestText = body || fallbackText;

      // 🔍 Match against known serviceTypes
      let matchedType = 'general';
      for (const type of serviceTypes) {
        if (requestText.toLowerCase().includes(type)) {
          matchedType = type;
          break;
        }
      }

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
          text: requestText,
          createdAt: new Date(),
          serviceType: matchedType,
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