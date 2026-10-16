"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OathSentenceBuilder() {
  const [goal, setGoal] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const router = useRouter();

  function seal() {
    const q = new URLSearchParams({ goal, date, amount, recipient });
    router.push("/oaths/new?" + q.toString());
  }

  const inputStyle = { width: 180, maxWidth: "100%" } as const;

  return (
    <div
      className="card-oath mx-auto max-w-[1000px] p-6 md:p-12"
      style={{ background: "#fff", color: "#0F1235" }}
    >
      <div
        className="font-mono-oath mb-4 text-xs tracking-widest"
        style={{ color: "#5A5F96" }}
      >
        YOUR OATH
      </div>
      <p className="font-serif-oath text-2xl leading-[1.7] md:text-4xl">
        I will{" "}
        <input
          aria-label="Goal"
          placeholder="[GOAL]"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="oath-chip-input"
          style={inputStyle}
        />{" "}
        by{" "}
        <input
          aria-label="Deadline"
          placeholder="[DATE]"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="oath-chip-input"
          style={{ ...inputStyle, width: 150 }}
        />
        . If I don&apos;t,{" "}
        <input
          aria-label="Stake amount"
          placeholder="[AMOUNT]"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="oath-chip-input"
          style={{ ...inputStyle, width: 150 }}
        />{" "}
        goes to{" "}
        <input
          aria-label="Recipient"
          placeholder="[RECIPIENT]"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="oath-chip-input"
          style={inputStyle}
        />
        .
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-5">
        <button
          onClick={seal}
          className="btn-pill"
          style={{
            background: "#2B3BFF",
            color: "#fff",
            minHeight: 52,
            padding: "16px 34px",
            fontSize: 17,
          }}
        >
          Seal my oath
        </button>
        <span className="text-sm" style={{ color: "#4B5080" }}>
          Validators check your public proof. No proof, no refund.
        </span>
      </div>
    </div>
  );
}
