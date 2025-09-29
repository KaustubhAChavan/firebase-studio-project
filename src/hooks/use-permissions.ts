
'use client';

import { useAppContext } from '@/context/AppContext';
import { Permission } from '@/config/permissions';

export function usePermissions() {
  const { currentUserPermissions } = useAppContext();

  const hasPermission = (permission: Permission): boolean => {
    if (!currentUserPermissions) {
      return false;
    }
    // 'full_access' grants all other permissions.
    if (currentUserPermissions.includes('full_access')) {
      return true;
    }
    return currentUserPermissions.includes(permission);
  };

  return { hasPermission };
}
