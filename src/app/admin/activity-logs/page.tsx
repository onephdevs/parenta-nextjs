import { redirect } from 'next/navigation';

/** Legacy path — activity feed now lives at /admin/activity */
export default function ActivityLogsRedirectPage() {
  redirect('/admin/activity');
}
