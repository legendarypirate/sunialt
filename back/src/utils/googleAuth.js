const { OAuth2Client } = require('google-auth-library');

// Same public OAuth client IDs as the Men app (Firebase project auth-6f3c8).
const DEFAULT_GOOGLE_CLIENT_IDS = [
  '536553320418-iiho2bkqg3kvn55e31lreem2shhhl444.apps.googleusercontent.com',
  '536553320418-4vifnpul3iqk22kb3c0l0f3qot691unt.apps.googleusercontent.com',
  '536553320418-e75lvofnha7nqlt122sq01u2cfahgut2.apps.googleusercontent.com',
  '536553320418-cgbu2tve552kol3193bfbottairinh7o.apps.googleusercontent.com',
  '536553320418-fha1is6eujvpoebon4e64g4h6n1v6jld.apps.googleusercontent.com',
  '536553320418-117ftm66hsn75tcjnk1kudnonvbnv97r.apps.googleusercontent.com',
];

function getGoogleClientIds() {
  const raw = process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || '';
  const fromEnv = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set([...fromEnv, ...DEFAULT_GOOGLE_CLIENT_IDS])];
}

function isGoogleAuthConfigured() {
  return getGoogleClientIds().length > 0;
}

async function verifyGoogleIdToken(idToken) {
  const clientIds = getGoogleClientIds();
  if (!clientIds.length) {
    const err = new Error('Google auth is not configured on the server');
    err.status = 503;
    throw err;
  }

  const client = new OAuth2Client();
  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken,
      audience: clientIds,
    });
  } catch (err) {
    const wrapped = new Error('Google нэвтрэлт баталгаажсангүй');
    wrapped.status = 401;
    wrapped.cause = err;
    throw wrapped;
  }

  const payload = ticket.getPayload();
  if (!payload) {
    const err = new Error('Invalid Google token');
    err.status = 401;
    throw err;
  }
  if (payload.email_verified === false) {
    const err = new Error('Google email is not verified');
    err.status = 401;
    throw err;
  }
  return payload;
}

module.exports = {
  getGoogleClientIds,
  isGoogleAuthConfigured,
  verifyGoogleIdToken,
};
