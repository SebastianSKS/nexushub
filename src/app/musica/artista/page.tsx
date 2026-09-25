import { Suspense } from "react";
import { PaginaArtista } from "@/modules/music/PaginaArtista";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PaginaArtista />
    </Suspense>
  );
}
