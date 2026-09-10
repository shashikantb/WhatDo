import { redirect } from "next/navigation";

interface PPostPageProps {
  params: { id: string };
}

export default function PPostAlias({ params }: PPostPageProps) {
  redirect(`/post/${params.id}`);
}
