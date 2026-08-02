"use client";

import { useState } from "react";
import { IconButton, Snackbar, Tooltip } from "@mui/material";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";

/**
 * ULASHISH tugmasi. Telefonda tizimning o'z "share" oynasi ochiladi
 * (Telegram, WhatsApp...), kompyuterda esa havola nusxalanadi.
 */
export function ShareButton({ title, text }: { title: string; text?: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: text ?? title, url });
        return;
      } catch {
        // Foydalanuvchi bekor qilgan bo'lsa - nusxalashga o'tmaymiz.
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard ruxsati bo'lmasa - hech narsa qilmaymiz.
    }
  };

  return (
    <>
      <Tooltip title="Ulashish">
        <IconButton onClick={share} aria-label="Ulashish">
          <ShareOutlinedIcon />
        </IconButton>
      </Tooltip>
      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Havola nusxalandi"
      />
    </>
  );
}
