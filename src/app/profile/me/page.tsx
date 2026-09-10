import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function ProfileMePage() {
  const session = await auth();
  const username = session?.user?.username;

  if (!username) {
    redirect("/login?callbackUrl=/profile/me");
  }

  redirect(`/profile/${username}`);
}
