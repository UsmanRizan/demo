"use client";

import { useState, useEffect, useCallback } from "react";

type StaffMember = {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  createdAt: string;
};

type StaffAssignment = {
  id: string;
  staffId: string;
  locationId: string;
  createdAt: string;
  staff: StaffMember;
};

type StaffManagerProps = {
  locationId: string;
};

export default function StaffManager({ locationId }: StaffManagerProps) {
  const [staff, setStaff] = useState<StaffAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    try {
      const response = await fetch(`/api/owner/locations/${locationId}/staff`);
      if (response.ok) {
        const data = await response.json();
        setStaff(data.staff);
      }
    } catch {
      console.error("Failed to fetch staff");
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/owner/locations/${locationId}/staff`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, password }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to assign staff");
        return;
      }

      setSuccess("Staff member assigned successfully");
      setPhone("");
      setPassword("");
      setShowForm(false);
      fetchStaff();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(staffId: string) {
    setRemovingId(staffId);
    setError("");

    try {
      const response = await fetch(
        `/api/owner/locations/${locationId}/staff`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ staffId }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to remove staff");
        return;
      }

      setStaff((prev) => prev.filter((s) => s.staffId !== staffId));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setRemovingId(null);
    }
  }

  function getStaffName(staff: StaffMember): string {
    return (
      [staff.firstName, staff.lastName].filter(Boolean).join(" ") ||
      staff.phone
    );
  }

  function formatPhone(phone: string): string {
    if (phone.length === 12) {
      return `+${phone.slice(0, 2)} ${phone.slice(2, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
    }
    return phone;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Staff</h3>
          <p className="mt-1 text-sm text-gray-500">
            Assign staff members to manage this location.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            setError("");
            setSuccess("");
          }}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          {showForm ? "Cancel" : "Assign Staff"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-600">
          {success}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAssign} className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="staff-phone"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Phone Number
            </label>
            <input
              id="staff-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+94 77 123 4567"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>
          <div>
            <label
              htmlFor="staff-password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="staff-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              minLength={6}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? "Assigning..." : "Assign Staff"}
          </button>
        </form>
      )}

      <div className="mt-4">
        {loading ? (
          <p className="py-4 text-center text-sm text-gray-400">Loading...</p>
        ) : staff.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
            </div>
            <p className="mt-2 text-sm text-gray-500">No staff assigned yet</p>
            <p className="mt-1 text-xs text-gray-400">
              Click &quot;Assign Staff&quot; to add a staff member.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {staff.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                    {getStaffName(assignment.staff)
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {getStaffName(assignment.staff)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatPhone(assignment.staff.phone)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(assignment.staffId)}
                  disabled={removingId === assignment.staffId}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  {removingId === assignment.staffId
                    ? "Removing..."
                    : "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
