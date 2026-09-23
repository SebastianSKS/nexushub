import { Suspense } from "react";
import { PaginaCalendario } from "@/modules/calendario/PaginaCalendario";

export default function Page() {
  // useSearchParams (para abrir desde el buscador global) exige una frontera Suspense en la exportación estática.
  return (
    <Suspense fallback={null}>
      <PaginaCalendario />
    </Suspense>
  );
}
