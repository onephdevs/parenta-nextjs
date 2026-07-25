'use client';

import { Alert } from '@/components/ui/Alert';

export interface FormErrorBannerProps {
  title?: string;
  message: string;
  className?: string;
}

export function FormErrorBanner({
  title = 'Something went wrong',
  message,
  className,
}: FormErrorBannerProps) {
  return (
    <Alert variant="danger" title={title} className={className}>
      {message}
    </Alert>
  );
}
