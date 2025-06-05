
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export const LoginButton: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center text-sm text-gray-600">
        Добро пожаловать, {user.name}
      </div>
    );
  }

  return (
    <div className="flex items-center text-sm text-gray-600">
      Гостевой доступ
    </div>
  );
};
