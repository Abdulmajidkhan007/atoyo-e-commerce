import Image from "next/image";

/**
 * Blog matnini chizadi: bo'sh qatorlar paragrafga bo'linadi, `[rasm:URL]`
 * belgilari esa haqiqiy rasm sifatida ko'rsatiladi (admin panelda "Matnga
 * rasm qo'shish" tugmasi shu belgini qo'yadi). HTML qabul qilinmaydi -
 * shu sabab XSS xavfi yo'q.
 */
export function BlogContent({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/).filter((b) => b.trim());

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, index) => {
        const imageMatch = block.trim().match(/^\[rasm:(https?:\/\/[^\]]+)\]$/);

        if (imageMatch) {
          return (
            <span
              key={index}
              className="relative block aspect-[16/10] w-full overflow-hidden rounded-xl2 bg-navy-50 dark:bg-navy-900"
            >
              <Image
                src={imageMatch[1]!}
                alt=""
                fill
                sizes="(max-width:768px) 100vw, 720px"
                className="object-cover"
              />
            </span>
          );
        }

        return (
          <p key={index} className="whitespace-pre-line leading-relaxed text-navy-500 dark:text-navy-100">
            {block}
          </p>
        );
      })}
    </div>
  );
}
