import Image from 'next/image';

interface BrandLogoProps {
  variant?: 'full' | 'mark';
  className?: string;
  priority?: boolean;
  height?: number;
}

/** Intrinsic size of /public/brand/widelogo.png (Alfonso Properties lockup). */
const FULL_LOGO_WIDTH = 1092;
const FULL_LOGO_HEIGHT = 160;

/**
 * Brand logo from /public/brand.
 * - full: horizontal lockup (widelogo.png) — Alfonso Properties
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
        alt="Alfonso Properties"
        width={size}
        height={size}
        className={`object-contain rounded-lg ${className}`}
        priority={priority}
      />
    );
  }

  const h = height ?? 40;
  const w = Math.round(h * (FULL_LOGO_WIDTH / FULL_LOGO_HEIGHT));

  return (
    <Image
      src="/brand/widelogo.png"
      alt="Alfonso Properties"
      width={w}
      height={h}
      className={`object-contain ${className}`}
      priority={priority}
    />
  );
}
