"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Arial, sans-serif",
            background: "#f8fafc",
            padding: "24px",
          }}
        >
          <div
            style={{
              maxWidth: "520px",
              width: "100%",
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "32px",
              textAlign: "center",
            }}
          >
            <h1
              style={{
                fontSize: "28px",
                marginBottom: "12px",
                color: "#dc2626",
              }}
            >
              AGRIVA Error
            </h1>

            <p
              style={{
                color: "#475569",
                marginBottom: "24px",
              }}
            >
              {error.message ||
                "An unexpected application error occurred."}
            </p>

            <button
              type="button"
              onClick={reset}
              style={{
                background: "#16a34a",
                color: "white",
                border: "none",
                borderRadius: "10px",
                padding: "12px 20px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Try Again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}