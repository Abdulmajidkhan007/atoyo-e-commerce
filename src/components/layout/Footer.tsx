import Link from "next/link";
import { NewsletterForm } from "./NewsletterForm";

const FOOTER_LINKS = [
  { href: "/katalog", label: "Katalog" },
  { href: "/kontakt", label: "Bog'lanish" },
  { href: "/kirish", label: "Kirish" },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-navy-100 bg-navy-900 text-navy-100 dark:border-navy-500">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-lg font-bold text-white">Atoyo Santexnika</p>
          <p className="mt-2 max-w-xs text-sm text-navy-300">
            Quvurlar, muftalar, kranlar, dush tizimlari va isitish qozonlari - sifatli
            santexnika mahsulotlari yetkazib beruvchi ishonchli hamkoringiz.
          </p>
        </div>

        <nav className="flex gap-6">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm hover:text-aqua-300">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="text-sm text-navy-300">
          <p>Telefon: +998 90 123 45 67</p>
          <p>Email: info@atoyo-santexnika.uz</p>
        </div>

        <NewsletterForm />
      </div>

      <p className="border-t border-navy-500/40 px-4 py-4 text-center text-xs text-navy-300">
        © {new Date().getFullYear()} Atoyo Santexnika. Barcha huquqlar himoyalangan.
      </p>
    </footer>
  );
}
