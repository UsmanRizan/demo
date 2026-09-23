export default function PageLoading() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-white px-4"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <svg className="spinner h-8 w-8 text-black" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-sm font-bold uppercase text-gray-500">Loading…</p>
      </div>
    </main>
  );
}
