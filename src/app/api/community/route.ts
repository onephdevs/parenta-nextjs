import { NextRequest } from 'next/server';
import { GET as peopleGet } from '@/app/api/people/route';

/** Legacy alias — prefer /api/people */
export async function GET(request: NextRequest) {
  return peopleGet(request);
}
