import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDocumentCategories, createDocumentCategory } from '@/lib/api/documents';

// Get all document categories
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const categories = await getDocumentCategories();
    
    return NextResponse.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching document categories:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch document categories' 
      },
      { status: 500 }
    );
  }
}

// Create new document category
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Category name is required' 
        },
        { status: 400 }
      );
    }

    const categoryData = {
      name: body.name,
      description: body.description,
      parentCategoryId: body.parentCategoryId,
    };

    const category = await createDocumentCategory(categoryData);
    
    return NextResponse.json({ 
      success: true,
      data: category,
      message: 'Category created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating document category:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          success: false,
          error: error.message 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create document category' 
      },
      { status: 500 }
    );
  }
} 