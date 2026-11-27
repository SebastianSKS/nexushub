import { Suspense } from "react";
import { PaginaConfiguracion } from "@/modules/configuracion/PaginaConfiguracion";

export default function Page() {
  // useSearchParams (la categoría elegida) exige una frontera Suspense en la exportación estática.
  return (
    <Suspense fallback={null}>
      <PaginaConfiguracion />
    </Suspense>
  );
}
