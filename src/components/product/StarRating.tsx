"use client";

import StarIcon from "@mui/icons-material/Star";
import StarHalfIcon from "@mui/icons-material/StarHalf";
import StarBorderIcon from "@mui/icons-material/StarBorder";

/** Faqat ko'rsatish uchun yulduzlar (0-5, yarim yulduz bilan). */
export function StarRating({ value, size = "small" }: { value: number; size?: "small" | "medium" }) {
  const fontSize = size === "medium" ? "medium" : "small";
  return (
    /*
      `role="img"` SHART. Nomsiz <span> da `aria-label` e'tiborsiz
      qoladi (ARIA qoidasi: "generic" rolga nom berib bo'lmaydi) va
      reyting besh dona nomsiz ikonka bo'lib o'qilardi. Rol bilan u
      bitta butun: "4.5 / 5 yulduz, rasm".
    */
    <span
      role="img"
      aria-label={`${value.toFixed(1)} / 5 yulduz`}
      className="inline-flex items-center text-amber-400"
    >
      {[1, 2, 3, 4, 5].map((i) => {
        if (value >= i) return <StarIcon key={i} fontSize={fontSize} />;
        if (value >= i - 0.5) return <StarHalfIcon key={i} fontSize={fontSize} />;
        return <StarBorderIcon key={i} fontSize={fontSize} className="text-navy-200" />;
      })}
    </span>
  );
}
