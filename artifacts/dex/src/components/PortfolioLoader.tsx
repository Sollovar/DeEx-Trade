const STYLE = `
  @keyframes pf-ring-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes pf-pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(255,60,0,0.45), 0 8px 32px rgba(255,60,0,0.35);
      transform: scale(1);
    }
    50% {
      box-shadow: 0 0 0 12px rgba(255,60,0,0), 0 8px 40px rgba(255,60,0,0.55);
      transform: scale(1.04);
    }
  }
  @keyframes pf-dot {
    0%, 80%, 100% { opacity: 0.2; transform: scale(1); }
    40%           { opacity: 1;   transform: scale(1.4); }
  }
  .pf-ring {
    position: absolute;
    inset: -12px;
    border-radius: 50%;
    border: 2px solid rgba(255,60,0,0.25);
    animation: pf-ring-spin 2.4s linear infinite;
  }
  .pf-box {
    animation: pf-pulse 2s ease-in-out infinite;
  }
  .pf-dot-1 { animation: pf-dot 1.2s ease-in-out infinite; animation-delay: 0s; }
  .pf-dot-2 { animation: pf-dot 1.2s ease-in-out infinite; animation-delay: 0.18s; }
  .pf-dot-3 { animation: pf-dot 1.2s ease-in-out infinite; animation-delay: 0.36s; }
`;

interface Props {
  message?: string;
  size?: "sm" | "md";
}

export function PortfolioLoader({ message = "Loading portfolio…", size = "md" }: Props) {
  const boxSize = size === "sm" ? 52 : 68;
  const fontSize = size === "sm" ? 22 : 30;
  const radius = size === "sm" ? 13 : 17;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: size === "sm" ? 14 : 20,
        minHeight: size === "sm" ? 120 : 200,
      }}
    >
      <style>{STYLE}</style>

      {/* Icon with spinning ring */}
      <div style={{ position: "relative", width: boxSize, height: boxSize }}>
        {/* Spinning ring */}
        <div className="pf-ring">
          {/* Orange dot on the ring (at the top) */}
          <div
            style={{
              position: "absolute",
              top: -5,
              left: "calc(50% - 5px)",
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#FF3C00",
              boxShadow: "0 0 8px 4px rgba(255,60,0,0.7)",
            }}
          />
        </div>

        {/* App icon box */}
        <div
          className="pf-box"
          style={{
            width: boxSize,
            height: boxSize,
            borderRadius: radius,
            background: "linear-gradient(135deg, #FF3C00 0%, #ff6a00 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Sheen */}
          <div
            style={{
              position: "absolute",
              top: "-60%",
              left: "-60%",
              width: "60%",
              height: "220%",
              background: "rgba(255,255,255,0.15)",
              transform: "rotate(25deg)",
              pointerEvents: "none",
            }}
          />
          <span
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize,
              fontWeight: 700,
              color: "#fff",
              letterSpacing: -1,
              position: "relative",
              zIndex: 1,
              userSelect: "none",
            }}
          >
            D
          </span>
        </div>
      </div>

      {/* Bouncing dots */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {(["pf-dot-1", "pf-dot-2", "pf-dot-3"] as const).map((cls) => (
          <div
            key={cls}
            className={cls}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#FF3C00",
              opacity: 0.2,
            }}
          />
        ))}
      </div>

      {/* Label */}
      <p
        style={{
          fontSize: size === "sm" ? 10 : 11,
          color: "rgba(255,255,255,0.3)",
          fontWeight: 500,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          margin: 0,
        }}
      >
        {message}
      </p>
    </div>
  );
}
