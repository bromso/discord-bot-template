import Link from "next/link";
export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-semibold">Bot Dashboard</h1>
      <p className="mt-4 text-zinc-400">Sign in with Discord to configure your servers.</p>
      <Link
        href="/login"
        className="mt-8 inline-flex rounded-md bg-indigo-500 px-4 py-2 font-medium hover:bg-indigo-400"
      >
        Sign in
      </Link>
    </main>
  );
}
