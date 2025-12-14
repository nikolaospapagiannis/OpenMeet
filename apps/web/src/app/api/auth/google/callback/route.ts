import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '1098756241362-2dtnj38p61fkh8h5ebd37u0rd4p91mkv.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4200';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${APP_URL}/login?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/login?error=no_code`);
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${APP_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(`${APP_URL}/login?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(`${APP_URL}/login?error=userinfo_failed`);
    }

    const userInfo = await userInfoResponse.json();

    // Strip /api suffix if present to avoid double /api/api
    const baseUrl = API_URL.replace(/\/api\/?$/, '');
    const backendResponse = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        googleId: userInfo.id,
        email: userInfo.email,
        firstName: userInfo.given_name || userInfo.name?.split(' ')[0] || 'User',
        lastName: userInfo.family_name || userInfo.name?.split(' ').slice(1).join(' ') || '',
        avatarUrl: userInfo.picture,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.text();
      console.error('Backend auth failed:', errorData);
      return NextResponse.redirect(`${APP_URL}/login?error=backend_auth_failed`);
    }

    const authData = await backendResponse.json();
    const cookieStore = await cookies();

    if (authData.accessToken) {
      cookieStore.set('accessToken', authData.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 15,
        path: '/',
      });
    }

    if (authData.refreshToken) {
      cookieStore.set('refreshToken', authData.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
    }

    const callbackUrl = state ? decodeURIComponent(state) : '/dashboard';
    return NextResponse.redirect(`${APP_URL}${callbackUrl}`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(`${APP_URL}/login?error=oauth_error`);
  }
}
