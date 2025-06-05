
import React from 'react';
import { Link } from 'wouter';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Shield } from 'lucide-react';

export const UserProfile: React.FC = () => {
  const { user, logout } = useUser();

  if (!user) {
    return null;
  }

  const getInitials = (name: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
  };

  const displayName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user.username || 'User';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-blue-600 text-white">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex flex-col space-y-1 p-2">
          <p className="text-sm font-medium leading-none">{displayName}</p>
          <p className="text-xs leading-none text-muted-foreground">
            ID: {user.username}
          </p>
        </div>
        <DropdownMenuSeparator />
        
        {/* Кнопка административной панели - только для администраторов */}
        {user.role === 'administrator' && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/admin" className="flex items-center">
                <Shield className="mr-2 h-4 w-4 text-orange-600" />
                <span className="text-orange-600 font-medium">Админ панель</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuItem>
          <i className="fas fa-user mr-2 h-4 w-4"></i>
          <span>Профиль</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <i className="fas fa-heart mr-2 h-4 w-4"></i>
          <span>Избранное</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <i className="fas fa-balance-scale mr-2 h-4 w-4"></i>
          <span>Сравнение</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <i className="fas fa-cog mr-2 h-4 w-4"></i>
          <span>Настройки</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <i className="fas fa-sign-out-alt mr-2 h-4 w-4"></i>
          <span>Выйти</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
