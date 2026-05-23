// Vercel Serverless Function to safely relay public environment variables to the client side.
module.exports = (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle options preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Return the configured environment variables (defaults to empty strings if not configured in Vercel Dashboard)
  res.status(200).json({
    GOOGLE_SHEETS_URL: process.env.GOOGLE_SHEETS_URL || "",
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || "",
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || "",
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "",
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || "",
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || ""
  });
};
