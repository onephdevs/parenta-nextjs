'use client';

import { useState } from 'react';
import { Session } from 'next-auth';
import { User, Mail, Phone, MapPin, Calendar, Camera, Lock } from 'lucide-react';

interface ProfileClientProps {
  session: Session;
}

export default function ProfileClient({ session }: ProfileClientProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
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
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, save to database via API
      // await fetch('/api/profile', {
      //   method: 'PUT',
      //   body: JSON.stringify(profileData),
      // });

      setSaveMessage('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, change password via API
      // await fetch('/api/profile/password', {
      //   method: 'PUT',
      //   body: JSON.stringify(passwordData),
      // });

      alert('Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      alert('Failed to change password');
    }
  };

  const getInitials = () => {
    return `${session.user.firstName?.charAt(0) || ''}${session.user.lastName?.charAt(0) || ''}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="mt-2 text-gray-900">
            Manage your personal information and account settings
          </p>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            saveMessage.includes('success') 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {saveMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col items-center">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="h-32 w-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                      {getInitials()}
                    </div>
                    <button className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors">
                      <Camera className="w-5 h-5 text-gray-900" />
                    </button>
                  </div>

                  {/* User Info */}
                  <h2 className="mt-4 text-2xl font-bold text-gray-900">
                    {session.user.firstName} {session.user.lastName}
                  </h2>
                  <p className="text-sm text-gray-900 capitalize">{session.user.role}</p>
                  <p className="mt-2 text-sm text-gray-900">{session.user.email}</p>

                  {/* Actions */}
                  <div className="mt-6 w-full space-y-3">
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    >
                      <User className="w-4 h-4 mr-2" />
                      {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                    </button>
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Change Password
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-900">Member since</span>
                  <span className="font-medium text-gray-900">Nov 2025</span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Personal Information
                </h3>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* First Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={profileData.firstName}
                      onChange={(e) =>
                        setProfileData({ ...profileData, firstName: e.target.value })
                      }
                      disabled={!isEditing}
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={profileData.lastName}
                      onChange={(e) =>
                        setProfileData({ ...profileData, lastName: e.target.value })
                      }
                      disabled={!isEditing}
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) =>
                        setProfileData({ ...profileData, email: e.target.value })
                      }
                      disabled={!isEditing}
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) =>
                        setProfileData({ ...profileData, phone: e.target.value })
                      }
                      disabled={!isEditing}
                      placeholder="+63 912 345 6789"
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={profileData.address}
                      onChange={(e) =>
                        setProfileData({ ...profileData, address: e.target.value })
                      }
                      disabled={!isEditing}
                      placeholder="123 Main Street"
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={profileData.city}
                      onChange={(e) =>
                        setProfileData({ ...profileData, city: e.target.value })
                      }
                      disabled={!isEditing}
                      placeholder="Manila"
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      State/Province
                    </label>
                    <input
                      type="text"
                      value={profileData.state}
                      onChange={(e) =>
                        setProfileData({ ...profileData, state: e.target.value })
                      }
                      disabled={!isEditing}
                      placeholder="Metro Manila"
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Zip Code */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Zip/Postal Code
                    </label>
                    <input
                      type="text"
                      value={profileData.zipCode}
                      onChange={(e) =>
                        setProfileData({ ...profileData, zipCode: e.target.value })
                      }
                      disabled={!isEditing}
                      placeholder="1000"
                      className="block w-full max-w-xs px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Bio */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) =>
                        setProfileData({ ...profileData, bio: e.target.value })
                      }
                      disabled={!isEditing}
                      rows={4}
                      placeholder="Tell us about yourself..."
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                    />
                  </div>
                </div>

                {/* Save Button */}
                {isEditing && (
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <>
          <div
            className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40"
            onClick={() => setShowPasswordModal(false)}
          />
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Change Password
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value,
                        })
                      }
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value,
                        })
                      }
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowPasswordModal(false)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePasswordChange}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    Change Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

