import { Suspense } from "react";
import { PaginaHorario } from "@/modules/horario/PaginaHorario";

export default function Page() {
  // useSearchParams (para abrir desde el buscador global) exige una frontera Suspense en la exportación estática.
  return (
    <Suspense fallback={null}>
      <PaginaHorario />
    </Suspense>
  );
}
