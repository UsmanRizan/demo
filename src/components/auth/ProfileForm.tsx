"use client";

import { FormEvent } from "react";

export type ProfileData = {
  firstName: string;
  lastName: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  country: string;
};

type ProfileFormProps = {
  profile: ProfileData;
  onFieldChange: (field: string, value: string) => void;
  onSave: (event: FormEvent) => void;
  onCancel: () => void;
  loading: boolean;
  saving: boolean;
  message: string;
  error: string;
};

export default function ProfileForm({
  profile,
  onFieldChange,
  onSave,
  onCancel,
  loading,
  saving,
  message,
  error,
}: ProfileFormProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Complete your profile</h1>

        <p className="mt-2 text-gray-600">
          These details will be used for your booking and payment.
        </p>

        {loading && (
          <p className="mt-4 text-sm text-gray-500">Loading profile...</p>
        )}

        <form onSubmit={onSave} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                First name
              </label>

              <input
                type="text"
                value={profile.firstName}
                onChange={(event) =>
                  onFieldChange("firstName", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Last name
              </label>

              <input
                type="text"
                value={profile.lastName}
                onChange={(event) =>
                  onFieldChange("lastName", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Email</label>

            <input
              type="email"
              value={profile.email}
              onChange={(event) =>
                onFieldChange("email", event.target.value)
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Address line 1
            </label>

            <input
              type="text"
              value={profile.addressLine1}
              onChange={(event) =>
                onFieldChange("addressLine1", event.target.value)
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Address line 2
            </label>

            <input
              type="text"
              value={profile.addressLine2}
              onChange={(event) =>
                onFieldChange("addressLine2", event.target.value)
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">City</label>

              <input
                type="text"
                value={profile.city}
                onChange={(event) =>
                  onFieldChange("city", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Country
              </label>

              <input
                type="text"
                value={profile.country}
                onChange={(event) =>
                  onFieldChange("country", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                required
              />
            </div>
          </div>

          {message && (
            <div
              className={`rounded-lg p-3 text-sm ${
                message.includes("saved")
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-black px-5 py-3 font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save & Continue"}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={onCancel}
          className="mt-4 block w-full text-center text-sm text-gray-500"
        >
          Cancel
        </button>
      </div>
    </main>
  );
}
