import Link from "next/link";

export default async function QRConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ points?: string; challenge?: string; slug?: string }>;
}) {
  const { points, challenge, slug } = await searchParams;
  const pts = Number(points ?? 0);
  const title = challenge ? decodeURIComponent(challenge) : null;

  return (
    <div className="min-h-screen bg-[#060A08] text-[#FFF7E8] flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-6">
        {/* Success animation */}
        <div className="w-20 h-20 mx-auto rounded-full bg-[#B8FF4D18] border border-[#B8FF4D40] flex items-center justify-center">
          <span className="text-4xl">✓</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-[#B8FF4D]">
            +{pts > 0 ? pts.toLocaleString() : "?"} pts
          </h1>
          <p className="text-white/70 text-sm">
            {title ? (
              <>Challenge validé : <span className="font-semibold text-white/90">{title}</span></>
            ) : (
              "QR code scanné avec succès !"
            )}
          </p>
          <p className="text-white/30 text-xs">
            Tes points ont été ajoutés à ton profil.
          </p>
        </div>

        {slug ? (
          <Link
            href={`/club/${slug}`}
            className="block w-full py-3 rounded-xl font-bold text-sm text-[#060A08] bg-[#B8FF4D] hover:brightness-110 transition-all"
          >
            Voir mon club →
          </Link>
        ) : (
          <Link
            href="/"
            className="block w-full py-3 rounded-xl font-bold text-sm border border-[#1e2820] text-white/50 hover:border-[#B8FF4D40] hover:text-white/80 transition-all"
          >
            Retour à l&apos;accueil
          </Link>
        )}
      </div>
    </div>
  );
}
