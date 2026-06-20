const PROVIDER_ICONS: Record<string, string> = {
  nfx: "https://images.justwatch.com/icon/207360008/s100/netflix.webp",
  amp: "https://images.justwatch.com/icon/52449861/s100/amazon-prime-video.webp",
};

export default function ProviderIcons({ providers, size = 16 }: { providers: string[]; size?: number }) {
  if (!providers.length) return null;
  return (
    <span className="inline-flex gap-0.5 items-center">
      {providers.map(code => PROVIDER_ICONS[code] ? (
        <img key={code} src={PROVIDER_ICONS[code]} alt={code} width={size} height={size} className="rounded-sm" />
      ) : null)}
    </span>
  );
}
