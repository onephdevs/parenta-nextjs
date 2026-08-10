import UnifiedSignInForm from './UnifiedSignInForm';

/**
 * Single login for admin, staff, caretaker, and tenant.
 * Role is detected from the account and used for redirect.
 */
export default function SignInPage() {
  return <UnifiedSignInForm />;
}
