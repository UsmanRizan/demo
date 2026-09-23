import type { Metadata } from "next";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Audit log" };

const PAGE_SIZE = 50;

type PageProps = {
  searchParams: Promise<{ action?: string; cursor?: string }>;
};

const ACTION_FILTERS = [
  { value: "", label: "All" },
  { value: "withdrawal.", label: "Withdrawals" },
  { value: "user.", label: "Users" },
  { value: "booking.", label: "Bookings" },
  { value: "location.", label: "Locations" },
  { value: "facility.", label: "Courts" },
  { value: "sport.", label: "Sports" },
  { value: "review.", label: "Reviews" },
  { value: "staff.", label: "Staff" },
  { value: "auth.", label: "Auth" },
  { value: "account.", label: "Accounts" },
];

export default async function AuditLogPage({ searchParams }: PageProps) {
  const user = await requireAdmin();
  const { action = "", cursor } = await searchParams;

  const logs = await prisma.auditLog.findMany({
    where: action ? { action: { startsWith: action } } : {},
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      actor: { select: { phone: true, firstName: true, lastName: true, role: true } },
    },
  });

  const hasMore = logs.length > PAGE_SIZE;
  const page = hasMore ? logs.slice(0, PAGE_SIZE) : logs;

  return (
    <main className="min-h-screen bg-white">
      <Header user={user} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <p className="text-sm font-bold uppercase text-gray-500">Admin</p>
        <h1 className="mt-1 text-2xl font-bold uppercase sm:text-3xl">Audit log</h1>
        <p className="mt-1 text-sm text-gray-500">
          Privileged actions: payouts, role changes, cancellations, closures and account events.
        </p>

        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Filter">
          {ACTION_FILTERS.map((filter) => (
            <a
              key={filter.value}
              href={filter.value ? `/admin/audit?action=${filter.value}` : "/admin/audit"}
              className={`border-[2px] border-black px-3 py-1.5 text-xs font-bold uppercase ${
                action === filter.value ? "bg-black text-white" : "hover:bg-black hover:text-white"
              }`}
            >
              {filter.label}
            </a>
          ))}
        </nav>

        <div className="mt-6 overflow-x-auto border-[3px] border-black">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b-[3px] border-black text-xs uppercase">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {page.map((log) => (
                <tr key={log.id} className="border-b border-gray-200 align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    {new Intl.DateTimeFormat("en-LK", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Colombo",
                    }).format(log.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {log.actor ? (
                      <>
                        <p className="font-bold">
                          {[log.actor.firstName, log.actor.lastName].filter(Boolean).join(" ") || log.actor.phone}
                        </p>
                        <p className="text-xs text-gray-500">{log.actor.role}</p>
                      </>
                    ) : (
                      <span className="text-gray-400">system</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                  <td className="px-4 py-3 text-xs">
                    {log.entityType}
                    {log.entityId && <span className="block text-gray-400">{log.entityId}</span>}
                  </td>
                  <td className="max-w-xs px-4 py-3 font-mono text-xs text-gray-600">
                    {log.metadata ? JSON.stringify(log.metadata) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{log.ip ?? "—"}</td>
                </tr>
              ))}
              {page.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No entries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {hasMore && (
          <a
            href={`/admin/audit?${new URLSearchParams({
              ...(action ? { action } : {}),
              cursor: page[page.length - 1].id,
            }).toString()}`}
            className="mt-4 inline-block border-[3px] border-black px-5 py-2.5 text-sm font-bold uppercase hover:bg-black hover:text-white"
          >
            Older entries →
          </a>
        )}
      </div>

      <Footer />
    </main>
  );
}
