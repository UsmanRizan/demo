"use client";

// Replaces the root layout when it fails, so it must render its own document
// and cannot rely on globals.css.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          background: "#fff",
          color: "#000",
          padding: 16,
        }}
      >
        <title>Something went wrong | BookMyPlay</title>
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            border: "3px solid #000",
            padding: 32,
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 22, textTransform: "uppercase", margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: "#555" }}>
            BookMyPlay hit an unexpected error. Please try again.
          </p>
          {error.digest && (
            <p style={{ fontSize: 12, color: "#999" }}>Reference: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 12,
              border: "3px solid #000",
              background: "#000",
              color: "#fff",
              padding: "12px 20px",
              fontWeight: 700,
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
