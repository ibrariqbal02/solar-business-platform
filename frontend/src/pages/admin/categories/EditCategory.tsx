import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { categoriesApi } from '../../../api/categories.api';
import { ROUTES } from '../../../lib/constants';
import { Skeleton } from '../../../components/ui/Skeleton';
import Button from '../../../components/ui/Button';
import CategoryForm from './CategoryForm';

export default function EditCategory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: category, isLoading, isError } = useQuery({
    queryKey: ['categories', 'detail', id],
    queryFn: async () => {
      const res = await categoriesApi.getById(id!);
      return res.data.data!;
    },
    enabled: !!id,
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <div className="py-6 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !category) {
    return (
      <div className="py-6 max-w-2xl mx-auto">
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          Failed to load category. It may have been deleted.
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate(ROUTES.adminCategories)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Categories
        </Button>
      </div>
    );
  }

  return <CategoryForm mode="edit" category={category} />;
}
