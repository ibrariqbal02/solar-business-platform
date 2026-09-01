import { useParams } from 'react-router-dom';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <div className="py-20 text-center">
      <h1 className="text-4xl font-bold text-gray-900">Product Detail</h1>
      <p className="mt-4 text-gray-500">Slug: <code>{slug}</code></p>
    </div>
  );
}
