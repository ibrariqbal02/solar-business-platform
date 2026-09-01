import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, ROUTES } from '../../../lib/constants';
import { productsApi } from '../../../api/products.api';
import ProductForm from './ProductForm';
import { Skeleton } from '../../../components/ui/Skeleton';
import Button from '../../../components/ui/Button';
import { ArrowLeft } from 'lucide-react';

export default function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [QUERY_KEYS.products, 'detail', id],
    queryFn: async () => {
      const res = await productsApi.getById(id!);
      return res.data.data!;
    },
    enabled: !!id,
    staleTime: 0, // always fresh for edit forms
  });

  if (isLoading) {
    return (
      <div className="py-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="py-6 max-w-4xl mx-auto">
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          Failed to load product. It may have been deleted.
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate(ROUTES.adminProducts)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Button>
      </div>
    );
  }

  return <ProductForm mode="edit" product={product} />;
}
