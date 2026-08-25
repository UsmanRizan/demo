"use client";

import { useRef } from "react";

type PaymentButtonProps = {
  action: string;
  fields: Record<string, string>;
  onCancel: () => void;
  error: string;
};

export default function PaymentButton({
  action,
  fields,
  onCancel,
  error,
}: PaymentButtonProps) {
  const submittedRef = useRef(false);

  function submitPayHere() {
    if (submittedRef.current) {
      return;
    }

    submittedRef.current = true;

    const form = document.createElement("form");

    form.method = "POST";
    form.action = action;

    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement("input");

      input.type = "hidden";
      input.name = name;
      input.value = value;

      form.appendChild(input);
    });

    document.body.appendChild(form);

    form.submit();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 px-4 sm:px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50 sm:p-10">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
            <svg className="h-7 w-7 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          </div>

          <h1 className="mt-5 text-xl font-semibold text-slate-900">Ready for payment</h1>

          <p className="mt-2 text-sm text-slate-500">
            Your selected booking is reserved while we prepare PayHere.
          </p>
        </div>

        <button
          type="button"
          onClick={submitPayHere}
          className="mt-8 w-full rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700"
        >
          Continue to PayHere
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="mt-3 block w-full text-center text-sm text-slate-500 hover:text-slate-700"
        >
          Cancel
        </button>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
        )}
      </div>
    </main>
  );
}
