"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="border-[3px] border-black bg-black px-4 py-2 text-sm font-bold uppercase text-white hover:bg-white hover:text-black"
    >
      Print / Save PDF
    </button>
  );
}
