"use client";

import { forwardRef } from "react";
import NextLink from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { useI18n } from "./LocaleContext";
import { localeHref } from "./href";

type NextLinkProps = ComponentPropsWithoutRef<typeof NextLink>;

/**
 * `next/link` ning tilga mos o'ralmasi — MIJOZ komponentlari uchun
 * YAGONA havola manbasi. `href` har doim "mantiqiy" (o'zbekcha,
 * prefiks'siz) yo'l sifatida yoziladi ("/katalog"), bu komponent uni
 * joriy tilga (`useI18n()`) qarab avtomatik `/ru/katalog` ga aylantiradi.
 * Shunda ruscha sahifada yurgan mijoz istalgan ichki havolani bossa
 * ham `/ru` yo'qolmaydi.
 *
 * MUI `component={Link}` patterni uchun `ref` forward qilinadi.
 */
export const Link = forwardRef<HTMLAnchorElement, NextLinkProps>(function Link(
  { href, ...rest },
  ref
) {
  const { locale } = useI18n();
  const resolvedHref = typeof href === "string" ? localeHref(href, locale) : href;
  return <NextLink ref={ref} href={resolvedHref} {...rest} />;
});
