import { google } from 'googleapis';

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

    const resList = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 5,
    });

    const messages = resList.data.messages || [];
    const emailData = [];

    for (const msg of messages) {
      const full = await gmail.users.messages.get({ userId: 'me', id: msg.id });
      const headers = full.data.payload.headers;
      const get = (name) => headers.find((h) => h.name === name)?.value || '';

      const from = get('From');
      const to = get('To');
      const subject = get('Subject');
      const snippet = full.data.snippet || '';

      // ✅ FILTER to only requests@neighboroonie.com
      if (!to.includes('requests@neighboroonie.com')) continue;

      emailData.push({ from, to, subject, snippet });
    }

    res.status(200).json({ found: emailData.length, emails: emailData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
}