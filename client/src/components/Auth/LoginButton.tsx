
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export const LoginButton: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      // Load Repl Auth script when component mounts
      const script = document.createElement('script');
      script.src = 'https://auth.util.repl.co/script.js';
      script.setAttribute('authed', 'window.location.reload()');
      
      // Find the login container and append script
      const loginContainer = document.getElementById('repl-auth-container');
      if (loginContainer) {
        loginContainer.appendChild(script);
      }

      return () => {
        // Cleanup script on unmount
        if (loginContainer && script.parentNode) {
          loginContainer.removeChild(script);
        }
      };
    }
  }, [isAuthenticated]);

  if (isAuthenticated) {
    return null; // Don't show login button if already authenticated
  }

  return (
    <div id="repl-auth-container" className="flex items-center">
      {/* The Repl Auth script will inject the login button here */}
    </div>
  );
};
