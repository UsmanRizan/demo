"use client";

import { FormEvent, useEffect, useState } from "react";

export default function PlayerProfilePage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Sri Lanka");
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/player/profile");
        const data = await response.json();

        if (!response.ok) {
          setMessage(data.error || "Failed to load profile");
          return;
        }

        const profile = data.profile;
        setFirstName(profile.firstName || "");
        setLastName(profile.lastName || "");
        setEmail(profile.email || "");
        setPhone(profile.phone || "");
        setAddressLine1(profile.address?.addressLine1 || "");
        setAddressLine2(profile.address?.addressLine2 || "");
        setCity(profile.address?.city || "");
        setCountry(profile.address?.country || "Sri Lanka");
        setHasPassword(profile.hasPassword || false);
      } catch {
        setMessage("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/player/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, addressLine1, addressLine2, city, country }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to save profile");
        return;
      }

      setMessage("Profile saved successfully.");
    } catch {
      setMessage("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage("");

    if (newPassword !== confirmPassword) {
      setPasswordMessage("New passwords do not match");
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage("Password must be at least 8 characters");
      setPasswordLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordMessage(data.error || "Failed to change password");
        setPasswordLoading(false);
        return;
      }

      setPasswordMessage("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    } catch {
      setPasswordMessage("Something went wrong");
    } finally {
      setPasswordLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-2xl flex items-center gap-3">
          <svg className="spinner h-5 w-5 text-black" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm text-gray-500">Loading profile...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <a href="/player" className="inline-flex items-center gap-1 text-sm font-bold uppercase text-gray-500 hover:text-black">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="square" strokeLinejoin="miter" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Dashboard
        </a>

        <div className="mt-6 border-[3px] border-black bg-white p-6 sm:p-8">
          <h1 className="text-2xl font-bold uppercase sm:text-3xl">Your Profile</h1>
          <p className="mt-1 text-sm text-gray-500">
            These details will be used when you make a payment.
          </p>

          <form onSubmit={saveProfile} className="mt-6 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-bold uppercase">First name</label>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="w-full border-[2px] border-black bg-white px-4 py-3 text-sm outline-none transition-colors focus:bg-gray-100"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold uppercase">Last name</label>
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="w-full border-[2px] border-black bg-white px-4 py-3 text-sm outline-none transition-colors focus:bg-gray-100"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold uppercase">Phone</label>
              <input
                value={phone}
                readOnly
                className="w-full border-[2px] border-gray-300 bg-gray-100 px-4 py-3 text-sm text-gray-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold uppercase">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full border-[2px] border-black bg-white px-4 py-3 text-sm outline-none transition-colors focus:bg-gray-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold uppercase">Address line 1</label>
              <input
                value={addressLine1}
                onChange={(event) => setAddressLine1(event.target.value)}
                className="w-full border-[2px] border-black bg-white px-4 py-3 text-sm outline-none transition-colors focus:bg-gray-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold uppercase">Address line 2</label>
              <input
                value={addressLine2}
                onChange={(event) => setAddressLine2(event.target.value)}
                className="w-full border-[2px] border-black bg-white px-4 py-3 text-sm outline-none transition-colors focus:bg-gray-100"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-bold uppercase">City</label>
                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className="w-full border-[2px] border-black bg-white px-4 py-3 text-sm outline-none transition-colors focus:bg-gray-100"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold uppercase">Country</label>
                <input
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="w-full border-[2px] border-black bg-white px-4 py-3 text-sm outline-none transition-colors focus:bg-gray-100"
                  required
                />
              </div>
            </div>

            {message && (
              <div className={`border-[2px] p-3 text-sm ${
                message.includes("success") ? "border-black bg-white text-black" : "border-red-600 bg-white text-red-600"
              }`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full border-[3px] border-black bg-black px-5 py-3 text-sm font-bold uppercase text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </form>

          {/* Password Section */}
          <div className="mt-10 border-t-[2px] border-black pt-8">
            <h2 className="text-xl font-bold uppercase">Password</h2>

            {hasPassword ? (
              <>
                {!showPasswordForm ? (
                  <button
                    type="button"
                    onClick={() => setShowPasswordForm(true)}
                    className="mt-4 border-[2px] border-black px-4 py-2.5 text-sm font-bold uppercase text-black transition-all hover:bg-black hover:text-white"
                  >
                    Change password
                  </button>
                ) : (
                  <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-bold uppercase">Current password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        className="w-full border-[2px] border-black bg-white px-4 py-3 text-sm outline-none transition-colors focus:bg-gray-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-bold uppercase">New password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        className="w-full border-[2px] border-black bg-white px-4 py-3 text-sm outline-none transition-colors focus:bg-gray-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-bold uppercase">Confirm new password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        className="w-full border-[2px] border-black bg-white px-4 py-3 text-sm outline-none transition-colors focus:bg-gray-100"
                        required
                      />
                    </div>

                    {passwordMessage && (
                      <div className={`border-[2px] p-3 text-sm ${
                        passwordMessage.includes("success") ? "border-black bg-white text-black" : "border-red-600 bg-white text-red-600"
                      }`}>
                        {passwordMessage}
                      </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="submit"
                        disabled={passwordLoading}
                        className="flex-1 border-[3px] border-black bg-black px-4 py-3 text-sm font-bold uppercase text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
                      >
                        {passwordLoading ? "Saving..." : "Update password"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setPasswordMessage("");
                          setCurrentPassword("");
                          setNewPassword("");
                          setConfirmPassword("");
                        }}
                        className="border-[2px] border-black px-4 py-3 text-sm font-bold uppercase text-black transition-all hover:bg-black hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <p className="mt-4 text-sm text-gray-500">
                You haven&apos;t set a password yet. Use OTP to sign in, or set one now from the login page.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
