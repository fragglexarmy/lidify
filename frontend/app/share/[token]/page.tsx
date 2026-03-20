import type { Metadata } from "next";
import SharePageClient from "./SharePageClient";

interface Props {
    params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { token } = await params;
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:3006";
    try {
        const res = await fetch(`${backendUrl}/api/share/${token}`, {
            next: { revalidate: 0 },
        });
        if (!res.ok) return { title: "Shared Music - Kima" };
        const data = await res.json();
        const title =
            data.entity?.name || data.entity?.title || "Shared Music";
        const artistName =
            data.entity?.artist?.name ||
            data.entity?.album?.artist?.name ||
            "Kima";
        const coverUrl: string | undefined =
            data.entity?.coverUrl ||
            data.entity?.items?.[0]?.track?.album?.coverUrl;
        return {
            title: `${title} - Kima`,
            openGraph: {
                title,
                description: `by ${artistName} -- shared on Kima`,
                images: coverUrl ? [{ url: coverUrl }] : [],
                type: "music.song",
                siteName: "Kima",
            },
        };
    } catch {
        return { title: "Shared Music - Kima" };
    }
}

export default function SharePage() {
    return <SharePageClient />;
}
