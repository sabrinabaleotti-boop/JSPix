import { ImageResponse } from "next/og";

export const alt = "JSPix — Gateway Pix especializada em Pagar.me";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const Mark = ({ s }: { s: number }) => (
  <div
    style={{
      width: s,
      height: s,
      borderRadius: s * 0.28,
      background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #60a5fa 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 20px 50px -16px rgba(37,99,235,0.8)",
    }}
  >
    <svg viewBox="0 0 24 24" width={s * 0.56} height={s * 0.56} fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l6 6-6 6-6-6z" />
      <path d="M6 15l6 6 6-6" />
    </svg>
  </div>
);

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "linear-gradient(135deg, #060a17 0%, #0b1a4a 55%, #123a9e 100%)",
          color: "white",
          fontFamily: "sans-serif",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", left: -140, top: -160, width: 520, height: 520, borderRadius: 999, background: "rgba(59,130,246,0.35)", filter: "blur(90px)" }} />
        <div style={{ position: "absolute", right: -120, bottom: -200, width: 560, height: 560, borderRadius: 999, background: "rgba(96,165,250,0.3)", filter: "blur(100px)" }} />

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 0 0 80px", width: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Mark s={72} />
            <div style={{ display: "flex", fontSize: 54, fontWeight: 800, letterSpacing: -2 }}>
              <span>JS</span>
              <span style={{ color: "#93c5fd" }}>Pix</span>
            </div>
          </div>
          <div style={{ display: "flex", alignSelf: "flex-start", marginTop: 34, padding: "8px 16px", borderRadius: 999, fontSize: 18, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#bfdbfe", background: "rgba(96,165,250,0.18)", border: "1px solid rgba(147,197,253,0.4)" }}>
            Gateway Pix especializada em Pagar.me
          </div>
          <div style={{ display: "flex", marginTop: 22, fontSize: 58, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2 }}>Receba por Pix em segundos.</div>
          <div style={{ display: "flex", marginTop: 20, fontSize: 25, lineHeight: 1.4, color: "rgba(255,255,255,0.78)" }}>
            Gere cobranças, acompanhe os pagamentos em tempo real e saque quando quiser.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 30 }}>
            {["Confirmação instantânea", "Saque em 1 dia útil", "Dados protegidos"].map((t) => (
              <div key={t} style={{ display: "flex", padding: "8px 16px", borderRadius: 999, fontSize: 17, fontWeight: 600, whiteSpace: "nowrap", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.22)" }}>
                {t}
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: "absolute", right: 80, top: 95, width: 420, display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: 30,
              borderRadius: 28,
              background: "linear-gradient(135deg, #1e40af 0%, #2563eb 55%, #60a5fa 100%)",
              boxShadow: "0 40px 80px -30px rgba(0,0,0,0.7)",
              transform: "rotate(-4deg)",
            }}
          >
            <div style={{ display: "flex", fontSize: 20, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>Saldo recebido</div>
            <div style={{ display: "flex", marginTop: 10, fontSize: 56, fontWeight: 800, letterSpacing: -2 }}>R$ 12.480,00</div>
            <div style={{ display: "flex", marginTop: 16, gap: 10 }}>
              <div style={{ display: "flex", padding: "8px 14px", borderRadius: 999, fontSize: 17, fontWeight: 600, background: "rgba(255,255,255,0.18)" }}>+ R$ 1.240,00 hoje</div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: 22,
              borderRadius: 24,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.18)",
              transform: "rotate(-4deg) translateX(26px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 16, background: "#10b981", boxShadow: "0 10px 24px -8px rgba(16,185,129,0.8)" }}>
              <div style={{ width: 13, height: 24, borderRight: "5px solid white", borderBottom: "5px solid white", transform: "rotate(45deg)", marginTop: -6 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 22, fontWeight: 700 }}>Pix recebido · R$ 350,00</div>
              <div style={{ display: "flex", fontSize: 17, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>Confirmado agora mesmo</div>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
