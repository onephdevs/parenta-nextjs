import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/db';
import type { CreateUserData } from '@/types/auth.types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, role, firstName, lastName } = body;

    // Validate required fields
    if (!email || !password || !role || !firstName || !lastName) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'All fields are required' 
        },
        { status: 400 }
      );
    }

    // Validate role
    if (role !== 'admin' && role !== 'tenant') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid role. Must be admin or tenant' 
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid email format' 
        },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Password must be at least 6 characters long' 
        },
        { status: 400 }
      );
    }

    const userData: CreateUserData = {
      email: email.toLowerCase().trim(),
      password,
      role,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    };

    const user = await createUser(userData);

    // Don't return sensitive data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user as unknown;

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: userWithoutPassword,
    });

  } catch (error) {
    console.error('Signup error:', error);
    
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'User with this email already exists' 
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to create user',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 