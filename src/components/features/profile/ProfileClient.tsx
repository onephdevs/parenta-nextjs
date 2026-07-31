'use client';

import { useEffect, useRef, useState } from 'react';
import { Session } from 'next-auth';
import { useSession } from 'next-auth/react';
import { User, Lock, Camera } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardBody, CardFooter } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { IconButton } from '@/components/ui/IconButton';
import { FormField } from '@/components/forms/FormField';

interface ProfileClientProps {
  session: Session;
}

export default function ProfileClient({ session }: ProfileClientProps) {
  const { update } = useSession();
  const { showSuccess, showError } = useNotifications();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveMessageVariant, setSaveMessageVariant] = useState<'success' | 'danger'>('success');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [profileData, setProfileData] = useState({
    firstName: session.user.firstName || '',
    lastName: session.user.lastName || '',
    email: session.user.email || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    bio: '',
    avatarUrl: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/profile');
        const data = await res.json();
        if (!cancelled && data.success && data.data) {
          setProfileData((prev) => ({
            ...prev,
            firstName: data.data.firstName || prev.firstName,
            lastName: data.data.lastName || prev.lastName,
            email: data.data.email || prev.email,
            phone: data.data.phone || '',
            address: data.data.address || '',
            city: data.data.city || '',
            state: data.data.state || '',
            zipCode: data.data.zipCode || '',
            bio: data.data.bio || '',
            avatarUrl: data.data.avatarUrl || '',
          }));
        }
      } catch {
        // Keep session defaults if profile fetch fails
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }

      await update({
        firstName: result.data.firstName,
        lastName: result.data.lastName,
        email: result.data.email,
      });

      setSaveMessage('Profile updated successfully!');
      setSaveMessageVariant('success');
      setIsEditing(false);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Failed to update profile');
      setSaveMessageVariant('danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    try {
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to change password');
      }

      showSuccess('Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to change password');
    }
  };

  const getInitials = () => {
    return `${session.user.firstName?.charAt(0) || ''}${session.user.lastName?.charAt(0) || ''}`;
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload photo');
      }
      setProfileData((prev) => ({ ...prev, avatarUrl: data.data.avatarUrl }));
      showSuccess('Profile photo updated');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="mt-2 text-gray-900">
            Manage your personal information and account settings
          </p>
        </div>

        {saveMessage && (
          <Alert variant={saveMessageVariant} className="mb-6">
            {saveMessage}
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card padding="none" className="overflow-hidden">
              <CardBody className="p-6">
                <div className="flex flex-col items-center">
                  <div className="relative">
                    {profileData.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profileData.avatarUrl}
                        alt="Profile"
                        className="h-32 w-32 rounded-full object-cover shadow-lg"
                      />
                    ) : (
                      <div className="h-32 w-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                        {getInitials()}
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                    <IconButton
                      label="Change profile photo"
                      variant="outline"
                      size="sm"
                      className="absolute bottom-0 right-0 bg-white shadow-lg"
                      isLoading={isUploadingPhoto}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="w-5 h-5" />
                    </IconButton>
                  </div>

                  <h2 className="mt-4 text-2xl font-bold text-gray-900">
                    {session.user.firstName} {session.user.lastName}
                  </h2>
                  <p className="text-sm text-gray-900 capitalize">{session.user.role}</p>
                  <p className="mt-2 text-sm text-gray-900">{session.user.email}</p>

                  <div className="mt-6 w-full space-y-3">
                    <Button
                      variant="outline"
                      className="w-full"
                      leftIcon={<User className="w-4 h-4" />}
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      leftIcon={<Lock className="w-4 h-4" />}
                      onClick={() => setShowPasswordModal(true)}
                    >
                      Change Password
                    </Button>
                  </div>
                </div>
              </CardBody>

              <CardFooter className="border-t border-gray-200 bg-gray-50 px-6 py-4 mt-0 pt-4">
                <div className="flex items-center justify-between text-sm w-full">
                  <span className="text-gray-900">Member since</span>
                  <span className="font-medium text-gray-900">Nov 2025</span>
                </div>
              </CardFooter>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card padding="none" className="overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Personal Information
                </h3>
              </div>

              <CardBody className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="First Name" htmlFor="profile-firstName">
                    <Input
                      id="profile-firstName"
                      type="text"
                      value={profileData.firstName}
                      onChange={(e) =>
                        setProfileData({ ...profileData, firstName: e.target.value })
                      }
                      isDisabled={!isEditing}
                    />
                  </FormField>

                  <FormField label="Last Name" htmlFor="profile-lastName">
                    <Input
                      id="profile-lastName"
                      type="text"
                      value={profileData.lastName}
                      onChange={(e) =>
                        setProfileData({ ...profileData, lastName: e.target.value })
                      }
                      isDisabled={!isEditing}
                    />
                  </FormField>

                  <FormField label="Email Address" htmlFor="profile-email">
                    <Input
                      id="profile-email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) =>
                        setProfileData({ ...profileData, email: e.target.value })
                      }
                      isDisabled={!isEditing}
                    />
                  </FormField>

                  <FormField label="Phone Number" htmlFor="profile-phone">
                    <Input
                      id="profile-phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) =>
                        setProfileData({ ...profileData, phone: e.target.value })
                      }
                      isDisabled={!isEditing}
                      placeholder="+63 912 345 6789"
                    />
                  </FormField>

                  <FormField label="Street Address" htmlFor="profile-address" className="md:col-span-2">
                    <Input
                      id="profile-address"
                      type="text"
                      value={profileData.address}
                      onChange={(e) =>
                        setProfileData({ ...profileData, address: e.target.value })
                      }
                      isDisabled={!isEditing}
                      placeholder="123 Main Street"
                    />
                  </FormField>

                  <FormField label="City" htmlFor="profile-city">
                    <Input
                      id="profile-city"
                      type="text"
                      value={profileData.city}
                      onChange={(e) =>
                        setProfileData({ ...profileData, city: e.target.value })
                      }
                      isDisabled={!isEditing}
                      placeholder="Manila"
                    />
                  </FormField>

                  <FormField label="State/Province" htmlFor="profile-state">
                    <Input
                      id="profile-state"
                      type="text"
                      value={profileData.state}
                      onChange={(e) =>
                        setProfileData({ ...profileData, state: e.target.value })
                      }
                      isDisabled={!isEditing}
                      placeholder="Metro Manila"
                    />
                  </FormField>

                  <FormField label="Zip/Postal Code" htmlFor="profile-zipCode" className="md:col-span-2">
                    <Input
                      id="profile-zipCode"
                      type="text"
                      value={profileData.zipCode}
                      onChange={(e) =>
                        setProfileData({ ...profileData, zipCode: e.target.value })
                      }
                      isDisabled={!isEditing}
                      placeholder="1000"
                      className="max-w-xs"
                    />
                  </FormField>

                  <FormField label="Bio" htmlFor="profile-bio" className="md:col-span-2">
                    <Textarea
                      id="profile-bio"
                      value={profileData.bio}
                      onChange={(e) =>
                        setProfileData({ ...profileData, bio: e.target.value })
                      }
                      isDisabled={!isEditing}
                      rows={4}
                      placeholder="Tell us about yourself..."
                      className="resize-none"
                    />
                  </FormField>
                </div>

                {isEditing && (
                  <div className="mt-6 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSave}
                      isLoading={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <>
          <div
            className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40"
            onClick={() => setShowPasswordModal(false)}
          />
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Card className="max-w-md w-full shadow-xl">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Change Password
                </h3>

                <div className="space-y-4">
                  <FormField label="Current Password" htmlFor="current-password">
                    <Input
                      id="current-password"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value,
                        })
                      }
                    />
                  </FormField>

                  <FormField label="New Password" htmlFor="new-password">
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value,
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Confirm New Password" htmlFor="confirm-password">
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handlePasswordChange}>
                    Change Password
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
