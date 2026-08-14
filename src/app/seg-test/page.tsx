"use client";
import { useState } from "react";
import { SegmentedPicker } from "@/components/product/SegmentedPicker";

export default function SegTest() {
  const [value, setValue] = useState("Satin Gold");
  const options = ["Satin Gold", "Gold", "Mokriy", "Black", "Nikel", "Tets", "Bronza"].map((v) => ({
    value: v,
    label: v,
    dimmed: v === "Black",
  }));
  return (
    <div className="mx-auto max-w-md p-6">
      <p className="mb-2 text-sm text-navy-300">Rangi</p>
      <SegmentedPicker options={options} value={value} onChange={setValue} ariaLabel="Rangi" />
      <p className="mt-4" id="picked">{value}</p>
    </div>
  );
}
