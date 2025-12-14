import { NextRequest, NextResponse } from 'next/server';

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || '';
const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID || 'common';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4200';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  // Build Microsoft OAuth URL
  const microsoftAuthUrl = new URL(`https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize`);
  microsoftAuthUrl.searchParams.set('client_id', MICROSOFT_CLIENT_ID);
  microsoftAuthUrl.searchParams.set('redirect_uri', `${APP_URL}/api/auth/microsoft/callback`);
  microsoftAuthUrl.searchParams.set('response_type', 'code');
  microsoftAuthUrl.searchParams.set('scope', 'openid email profile User.Read');
  microsoftAuthUrl.searchParams.set('response_mode', 'query');
  microsoftAuthUrl.searchParams.set('state', encodeURIComponent(callbackUrl));

  return NextResponse.redirect(microsoftAuthUrl.toString());
}
