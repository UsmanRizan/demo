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
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 px-4 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <a href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
              B
            </div>
            <span className="text-2xl font-bold text-slate-900">BookMyPlay</span>
          </a>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
          <h1 className="text-xl font-semibold text-slate-900">Complete your profile</h1>

          <p className="mt-1 text-sm text-slate-500">
            These details will be used for your booking and payment.
          </p>

          {loading && (
            <div className="mt-4 flex items-center gap-2">
              <svg className="spinner h-4 w-4 text-indigo-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm text-slate-500">Loading profile...</span>
            </div>
          )}

          <form onSubmit={onSave} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  First name
                </label>
                <input
                  type="text"
                  value={profile.firstName}
                  onChange={(event) =>
                    onFieldChange("firstName", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Last name
                </label>
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(event) =>
                    onFieldChange("lastName", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(event) =>
                  onFieldChange("email", event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Address line 1
              </label>
              <input
                type="text"
                value={profile.addressLine1}
                onChange={(event) =>
                  onFieldChange("addressLine1", event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Address line 2
              </label>
              <input
                type="text"
                value={profile.addressLine2}
                onChange={(event) =>
                  onFieldChange("addressLine2", event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">City</label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(event) =>
                    onFieldChange("city", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Country
                </label>
                <input
                  type="text"
                  value={profile.country}
                  onChange={(event) =>
                    onFieldChange("country", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>
            </div>

            {message && (
              <div
                className={`rounded-xl p-3 text-sm ${
                  message.includes("saved")
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none"
            >
              {saving ? "Saving..." : "Save & Continue"}
            </button>
          </form>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={onCancel}
            className="mt-4 block w-full text-center text-sm text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </main>
  );
}
