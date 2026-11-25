import { Suspense } from "react";
import { PaginaSemestres } from "@/modules/horario/PaginaSemestres";

export default function Page() {
  // useSearchParams (para abrir un semestre) exige una frontera Suspense en la exportación estática.
  return (
    <Suspense fallback={null}>
      <PaginaSemestres />
    </Suspense>
  );
}
