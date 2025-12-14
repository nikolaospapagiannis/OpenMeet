import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4200';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '1098756241362-2dtnj38p61fkh8h5ebd37u0rd4p91mkv.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${APP_URL}/integrations/google-meet/settings?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/integrations/google-meet/settings?error=missing_params`);
  }

  // Decode state to get userId
  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
    userId = decoded.userId;
  } catch {
    return NextResponse.redirect(`${APP_URL}/integrations/google-meet/settings?error=invalid_state`);
  }

  try {
    // Exchange code for tokens
    const redirectUri = `${APP_URL}/api/integrations/meet/oauth/callback`;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(`${APP_URL}/integrations/google-meet/settings?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = userInfoResponse.ok ? await userInfoResponse.json() : {};

    // Get the auth token from cookies to authenticate with API
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    // Save the integration via API
    const baseUrl = API_URL.replace(/\/api\/?$/, '');
    const apiResponse = await fetch(`${baseUrl}/api/integrations/meet/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        email: userInfo.email,
        name: userInfo.name,
      }),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.text();
      console.error('API save integration failed:', errorData);
      return NextResponse.redirect(`${APP_URL}/integrations/google-meet/settings?error=save_failed`);
    }

    return NextResponse.redirect(`${APP_URL}/integrations/google-meet/settings?success=true`);
  } catch (error) {
    console.error('Meet OAuth callback error:', error);
    return NextResponse.redirect(`${APP_URL}/integrations/google-meet/settings?error=callback_failed`);
  }
}
