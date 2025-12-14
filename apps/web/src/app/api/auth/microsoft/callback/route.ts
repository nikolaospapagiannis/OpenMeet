import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || '';
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || '';
const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID || 'common';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4200';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    console.error('Microsoft OAuth error:', error, errorDescription);
    return NextResponse.redirect(`${APP_URL}/login?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/login?error=no_code`);
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        redirect_uri: `${APP_URL}/api/auth/microsoft/callback`,
        grant_type: 'authorization_code',
        scope: 'openid email profile User.Read',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Microsoft token exchange failed:', errorData);
      return NextResponse.redirect(`${APP_URL}/login?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();

    // Get user info from Microsoft Graph API
    const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      const errorData = await userInfoResponse.text();
      console.error('Microsoft user info failed:', errorData);
      return NextResponse.redirect(`${APP_URL}/login?error=userinfo_failed`);
    }

    const userInfo = await userInfoResponse.json();

    // Send to backend
    const baseUrl = API_URL.replace(/\/api\/?$/, '');
    const backendResponse = await fetch(`${baseUrl}/api/auth/microsoft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        microsoftId: userInfo.id,
        email: userInfo.mail || userInfo.userPrincipalName,
        firstName: userInfo.givenName || userInfo.displayName?.split(' ')[0] || 'User',
        lastName: userInfo.surname || userInfo.displayName?.split(' ').slice(1).join(' ') || '',
        avatarUrl: null, // Microsoft Graph requires separate call for photo
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
        maxAge: 60 * 15, // 15 minutes
        path: '/',
      });
    }

    if (authData.refreshToken) {
      cookieStore.set('refreshToken', authData.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
    }

    const callbackUrl = state ? decodeURIComponent(state) : '/dashboard';
    return NextResponse.redirect(`${APP_URL}${callbackUrl}`);
  } catch (error) {
    console.error('Microsoft OAuth error:', error);
    return NextResponse.redirect(`${APP_URL}/login?error=oauth_error`);
  }
}
