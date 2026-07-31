import Image from 'next/image';

interface BrandLogoProps {
  variant?: 'full' | 'mark';
  className?: string;
  priority?: boolean;
  height?: number;
}

/**
 * Brand logo from /public/brand.
 * - full: horizontal lockup (widelogo.png)
 * - mark: square logo (logo.png)
 */
export function BrandLogo({
  variant = 'full',
  className = '',
  priority = false,
  height,
}: BrandLogoProps) {
  if (variant === 'mark') {
    const size = height ?? 40;
    return (
      <Image
        src="/brand/logo.png"
        alt="Alfonso"
        width={size}
        height={size}
        className={`object-contain rounded-lg ${className}`}
        priority={priority}
      />
    );
  }

  const h = height ?? 40;
  const w = Math.round(h * (344 / 99));

  return (
    <Image
      src="/brand/widelogo.png"
      alt="Alfonso Property Management System"
      width={w}
      height={h}
      className={`object-contain ${className}`}
      priority={priority}
    />
  );
}
