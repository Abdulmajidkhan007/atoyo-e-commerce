export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div className="mx-auto max-w-7xl px-4 py-8">Mahsulot tafsiloti: {id}</div>;
}
