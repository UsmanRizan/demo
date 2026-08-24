import { requireOwner } from "@/lib/owner";

import NewLocationForm from "./NewLocationForm";

export default async function NewLocationPage() {
  const user = await requireOwner();

  return <NewLocationForm />;
}
