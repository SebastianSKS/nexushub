import { Suspense } from "react";
import { PaginaRepaso } from "@/modules/repaso/PaginaRepaso";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PaginaRepaso />
    </Suspense>
  );
}
