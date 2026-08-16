"use client";

import { useEffect, useState } from "react";

type UserRole = "PLAYER" | "OWNER" | "ADMIN";

type User = {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: UserRole;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadUsers() {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/users");
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to load users");
        return;
      }

      setUsers(data.users);
    } catch {
      setMessage("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(userId: string, role: "PLAYER" | "OWNER") {
    setMessage("");

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to update role");
        return;
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === userId
            ? {
                ...user,
                role: data.user.role,
              }
            : user,
        ),
      );

      setMessage("User role updated.");
    } catch {
      setMessage("Failed to update role");
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Users</h1>
            <p className="mt-1 text-gray-600">
              Manage BookMyPlay users and roles.
            </p>
          </div>

          <a
            href="/admin"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm"
          >
            Back to Dashboard
          </a>
        </div>

        {message && (
          <div className="mt-6 rounded-lg bg-white p-4 text-sm shadow-sm">
            {message}
          </div>
        )}

        <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-sm">
          {loading ? (
            <div className="p-6">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="p-6">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Phone
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Name
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Role
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="px-6 py-4">{user.phone}</td>

                      <td className="px-6 py-4">
                        {user.firstName || user.lastName
                          ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
                          : "—"}
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
                          {user.role}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {user.role !== "ADMIN" && (
                          <select
                            value={user.role}
                            onChange={(event) =>
                              changeRole(
                                user.id,
                                event.target.value as "PLAYER" | "OWNER",
                              )
                            }
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          >
                            <option value="PLAYER">Player</option>

                            <option value="OWNER">Owner</option>
                          </select>
                        )}

                        {user.role === "ADMIN" && (
                          <span className="text-sm text-gray-500">
                            Administrator
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
