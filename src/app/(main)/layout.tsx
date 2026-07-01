// Header, Footer va mobil pastki navigatsiya shu yerga qo'shiladi (keyingi UI bosqichida).
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">{children}</main>
    </div>
  );
}
