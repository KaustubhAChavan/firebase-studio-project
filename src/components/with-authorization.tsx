
'use client';

import { usePathname } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { getRequiredPermission } from '@/config/routes';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { ShieldAlert } from 'lucide-react';
import React from 'react';

export function withAuthorization<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  const WithAuthorization = (props: P) => {
    const pathname = usePathname();
    const { hasPermission } = usePermissions();

    const requiredPermission = getRequiredPermission(pathname);
    
    if (requiredPermission && !hasPermission(requiredPermission)) {
      return (
        <div className="flex items-center justify-center p-8">
            <Alert variant="destructive" className="max-w-lg">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>
                    You do not have the required permissions to view this page. Please contact your administrator if you believe this is an error.
                </AlertDescription>
            </Alert>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };

  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  WithAuthorization.displayName = `withAuthorization(${displayName})`;

  return WithAuthorization;
}
