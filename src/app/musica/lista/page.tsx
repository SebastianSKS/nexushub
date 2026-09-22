import { Suspense } from "react";
import { PaginaLista } from "@/modules/music/PaginaLista";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PaginaLista />
    </Suspense>
  );
}
