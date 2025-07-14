import { google } from 'googleapis';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import credentials from '../../firebase-admin.json';

initializeApp({ credential: cert(credentials) });
const db = getFirestore();

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
    const resList = await gmail.users.messages.list({ userId: 'me', maxResults: 5 });
    const messages = resList.data.messages || [];

    let posted = 0;

    for (const msg of messages) {
      const full = await gmail.users.messages.get({ userId: 'me', id: msg.id });
      const headers = full.data.payload.headers;
      const get = (name) => headers.find((h) => h.name === name)?.value || '';

      const from = get('From');
      const to = get('To');
      const subject = get('Subject');
      const snippet = full.data.snippet || '';

      if (!to.includes('requests@neighboroonie.com')) continue;

      const fromEmail = from.match(/<(.*)>/)?.[1] || from;
      const userSnap = await db.collection('users').where('email', '==', fromEmail).get();

      if (userSnap.empty) continue;

      const userDoc = userSnap.docs[0];
      const userData = userDoc.data();
      const groupIds = userData.groupIds || [];

      const body = full.data.payload.parts?.[0]?.body?.data;
      const decodedBody = body ? Buffer.from(body, 'base64').toString('utf-8') : snippet;

      for (const groupId of groupIds) {
        await db.collection('requests').add({
          name: userData.firstName || fromEmail,
          email: fromEmail,
          requestText: decodedBody,
          serviceType: '', // unknown for now
          groupId,
          createdAt: new Date(),
          submittedByUid: userDoc.id,
        });
        posted++;
      }
    }

    res.status(200).json({ message: `Posted ${posted} requests.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to parse and post requests.' });
  }
}