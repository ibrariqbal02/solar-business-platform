import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle } from 'lucide-react';
import { authApi } from '../../api/auth.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

// ─── Validation schema ────────────────────────────────────────────────────────

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChangePassword() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setServerError(null);
    setSuccess(false);
    try {
      await authApi.changePassword(values.currentPassword, values.newPassword);
      setSuccess(true);
      reset();
    } catch (err: unknown) {
      const axiosMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message;
      setServerError(
        axiosMessage ?? 'Failed to change password. Please try again.',
      );
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Change Password</h1>
      <p className="text-sm text-gray-500 mb-8">
        Update your admin account password. You will stay logged in after
        changing it.
      </p>

      {/* Success banner */}
      {success && (
        <div
          role="status"
          className="mb-6 flex items-center gap-3 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700"
        >
          <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Password changed successfully.
        </div>
      )}

      {/* Error banner */}
      {serverError && (
        <div
          role="alert"
          className="mb-6 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {serverError}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-8">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />

          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
            helperText="Must be at least 8 characters"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />

          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <div className="pt-2">
            <Button type="submit" isLoading={isSubmitting}>
              {isSubmitting ? 'Updating…' : 'Update password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
