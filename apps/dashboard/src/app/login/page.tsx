import { Button } from "@repo/ui/components/button";
import { signIn } from "@/auth";

export default function Login() {
  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <h1 className="text-3xl font-semibold">Sign in</h1>
      <form
        action={async () => {
          "use server";
          await signIn("discord", { redirectTo: "/guilds" });
        }}
      >
        <Button className="mt-6">Continue with Discord</Button>
      </form>
    </main>
  );
}
