// Matches backend/src/models/admin.model.ts (safeAdmin shape returned by API)

export type AdminRole = 'super_admin' | 'admin' | 'editor';

export interface SafeAdmin {
  _id: string;
  name: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── API response shapes ───────────────────────────────────────────────────────

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    admin: SafeAdmin;
  };
}

export interface RefreshResponse {
  success: boolean;
  data: {
    accessToken: string;
  };
}

export interface MeResponse {
  success: boolean;
  data: SafeAdmin;
}
