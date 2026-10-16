import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[600px] px-6 py-24 text-center">
      <h1 className="font-serif-oath text-6xl">No oath here.</h1>
      <p className="mt-4" style={{ color: "var(--ink-muted)" }}>
        That page does not exist.
      </p>
      <div className="mt-8">
        <Link href="/" className="btn-pill" style={{ background: "var(--primary)", color: "#fff" }}>
          Back home
        </Link>
      </div>
    </div>
  );
}
