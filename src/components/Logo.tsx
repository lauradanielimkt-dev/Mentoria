import Image from "next/image";

/**
 * Logo da Marmaris (SVG com fill="currentColor"): usa a cor do texto do pai.
 * Para tingir, envolva num elemento com `text-[var(--primary)]` etc.
 */
export function Logo({ className = "h-8 w-auto", tom = "marca" }: { className?: string; tom?: "marca" | "branco" }) {
  // Com <img> + mask não dá para usar currentColor; usamos mask-image para tingir.
  const cor = tom === "branco" ? "#ffffff" : "var(--primary)";
  return (
    <span
      role="img"
      aria-label="Marmaris"
      className={`inline-block ${className}`}
      style={{
        aspectRatio: "89 / 36",
        background: cor,
        WebkitMaskImage: "url(/logo-marmaris.svg)",
        maskImage: "url(/logo-marmaris.svg)",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

/** Variante leve para favicons/avatares, sem máscara. */
export function LogoImagem({ size = 32 }: { size?: number }) {
  return <Image src="/logo-marmaris.svg" alt="Marmaris" width={size} height={Math.round(size * 0.4)} priority />;
}
