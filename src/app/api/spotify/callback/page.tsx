import { Suspense } from "react";
import { PaginaCallback } from "@/modules/music/PaginaCallback";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PaginaCallback />
    </Suspense>
  );
}
