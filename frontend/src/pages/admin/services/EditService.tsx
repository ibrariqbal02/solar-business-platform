import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { servicesApi } from '../../../api/services.api';
import { QUERY_KEYS, ROUTES } from '../../../lib/constants';
import { Skeleton } from '../../../components/ui/Skeleton';
import Button from '../../../components/ui/Button';
import ServiceForm from './ServiceForm';

export default function EditService() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: service, isLoading, isError } = useQuery({
    queryKey: [QUERY_KEYS.services, 'detail', id],
    queryFn: async () => {
      const res = await servicesApi.getById(id!);
      return res.data.data!;
    },
    enabled: !!id,
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <div className="py-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !service) {
    return (
      <div className="py-6 max-w-3xl mx-auto">
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          Failed to load service. It may have been deleted.
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate(ROUTES.adminServices)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Services
        </Button>
      </div>
    );
  }

  return <ServiceForm mode="edit" service={service} />;
}
