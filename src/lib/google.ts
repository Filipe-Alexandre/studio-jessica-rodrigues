import "server-only";

import { JWT } from "google-auth-library";
import { google } from "googleapis";

const getPrivateKey = () =>
  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n") ?? "";

const getGoogleAuth = () => {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = getPrivateKey();

  if (!serviceAccountEmail || !privateKey) {
    throw new Error(
      "Credenciais do Google ausentes. Defina GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY no .env.local."
    );
  }

  return new JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/calendar",
    ],
  });
};

export const googleAuth = getGoogleAuth();

export const sheets = google.sheets({
  version: "v4",
  auth: googleAuth,
});

export const calendar = google.calendar({
  version: "v3",
  auth: googleAuth,
});
