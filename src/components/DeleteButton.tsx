"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteButton({ id }: { id: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/paste/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to delete paste:", err);
    } finally {
      setIsDeleting(false);
      setConfirm(false);
    }
  };

  if (confirm) {
    return (
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-500/90 transition-colors disabled:opacity-50"
      >
        {isDeleting ? "Deleting..." : "Confirm?"}
      </button>
    );
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="px-3 py-1.5 text-xs font-medium text-dark-text-secondary hover:text-red-400 bg-dark-surface border border-dark-border rounded-lg hover:border-red-500/30 transition-all disabled:opacity-50"
    >
      Delete
    </button>
  );
}
