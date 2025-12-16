import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// GET /api/users/me - Proxy to backend API for current user profile
export async function GET(request: NextRequest) {
  try {
    // Forward the request to the backend API
    const authHeader = request.headers.get('authorization');
    const userId = request.headers.get('x-user-id');
    const cookies = request.headers.get('cookie');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    if (userId) {
      headers['x-user-id'] = userId;
    }
    if (cookies) {
      headers['Cookie'] = cookies;
    }

    const response = await fetch(`${API_BASE_URL}/api/users/me`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error proxying to backend API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/users/me - Proxy to backend API for updating user preferences
export async function PATCH(request: NextRequest) {
  try {
    // Forward the request to the backend API
    const authHeader = request.headers.get('authorization');
    const userId = request.headers.get('x-user-id');
    const cookies = request.headers.get('cookie');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    if (userId) {
      headers['x-user-id'] = userId;
    }
    if (cookies) {
      headers['Cookie'] = cookies;
    }

    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/api/users/me`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error proxying to backend API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
