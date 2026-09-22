import { Suspense } from "react";
import { PaginaMusica } from "@/modules/music/PaginaMusica";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PaginaMusica />
    </Suspense>
  );
}
