import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import UserManager from "../UserManager";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (!ADMIN_USER_IDS.includes(user.id)) redirect("/dashboard");

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Users</h1>
      <UserManager />
    </div>
  );
}
