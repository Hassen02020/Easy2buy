"use client";

import { useState } from "react";
import { changeOrderStatus } from "@/app/admin/actions";

const STATUS_LABELS: Record<string, string> = {
  PENDING:   "En attente",
  CONFIRMED: "Confirmée",
  PREPARING: "Préparation",
  SHIPPED:   "Expédiée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
  RETURNED:  "Retournée",
};

const ALL_STATUSES = Object.keys(STATUS_LABELS);

interface OrderStatusFormProps {
  orderId: number;
  currentStatus: string;
}

export function OrderStatusForm({ orderId, currentStatus }: OrderStatusFormProps) {
  const [selected, setSelected] = useState(currentStatus);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    await changeOrderStatus(formData);
    setPending(false);
  }

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="newStatus" value={selected} />
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={pending}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50"
      >
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="ml-2 text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded-lg transition-colors"
      >
        {pending ? "..." : "OK"}
      </button>
    </form>
  );
}
