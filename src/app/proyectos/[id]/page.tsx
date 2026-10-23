import ValidacionPanel from "@/components/ValidacionPanel";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProyectoDetallePage({ params }: Props) {
  const { id } = await params;
  return <ValidacionPanel proyectoId={id} />;
}
