import { NextRequest } from 'next/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  console.log(`Procesando PATCH para el ID: ${id}`);
  return new Response(JSON.stringify({ message: `Actualizado el ID: ${id}` }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return new Response(JSON.stringify({ id }), { status: 200 });
}
