import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 16,
          background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #60a5fa 100%)",
        }}
      >
        <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l6 6-6 6-6-6z" />
          <path d="M6 15l6 6 6-6" />
        </svg>
      </div>
    ),
    size,
  );
}
