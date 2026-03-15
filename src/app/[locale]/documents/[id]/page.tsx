import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DocumentPage({ params }: Props) {
  const { id } = await params;
  redirect(`/papers/${id}`);
}
