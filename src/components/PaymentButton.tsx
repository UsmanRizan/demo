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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 sm:px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold">Ready for payment</h1>

        <p className="mt-2 text-gray-600">
          Your selected booking is reserved while we prepare PayHere.
        </p>

        <button
          type="button"
          onClick={submitPayHere}
          className="mt-8 w-full rounded-lg bg-black px-5 py-3 font-medium text-white"
        >
          Continue to PayHere
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="mt-4 block w-full text-center text-sm text-gray-500"
        >
          Cancel
        </button>

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
      </div>
    </main>
  );
}
