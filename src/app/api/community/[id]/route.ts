import { GET as peopleIdGet } from '@/app/api/people/[id]/route';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Legacy alias — prefer /api/people/[id] */
export async function GET(request: Request, ctx: RouteParams) {
  return peopleIdGet(request, ctx);
}
