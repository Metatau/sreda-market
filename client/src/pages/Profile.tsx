
import React, { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Settings, 
  Bell, 
  Heart, 
  Scale, 
  MessageSquare, 
  BarChart3,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function Profile() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Войдите в аккаунт
              </h2>
              <p className="text-gray-600">
                Для просмотра профиля необходимо войти в систему
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleSave = () => {
    // В реальном приложении здесь бы отправлялся запрос на сервер
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(user.name);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Профиль Header */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="text-2xl font-bold h-auto border-none p-0 focus-visible:ring-0"
                      />
                      <Button size="sm" onClick={handleSave}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancel}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                      <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
                <p className="text-gray-600">ID: {user.id}</p>
                {user.roles && (
                  <div className="mt-2">
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200 font-medium border">{user.roles}</Badge>
                  </div>
                )}
              </div>
              
              <Button variant="destructive" onClick={logout}>
                Выйти
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="activity" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Активность
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Избранное
            </TabsTrigger>
            <TabsTrigger value="comparisons" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Сравнения
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Настройки
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Статистика активности
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">0</div>
                    <div className="text-sm text-gray-600">Просмотров объектов</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-500">0</div>
                    <div className="text-sm text-gray-600">В избранном</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">0</div>
                    <div className="text-sm text-gray-600">Сравнений</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Последние чаты с AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8">
                  История чатов будет отображаться здесь
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="favorites" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Избранные объекты
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8">
                  У вас пока нет избранных объектов
                </p>
                <div className="text-center">
                  <Button onClick={() => window.location.href = '/'}>
                    Найти недвижимость
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparisons" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Списки сравнения
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8">
                  У вас нет активных сравнений
                </p>
                <div className="text-center">
                  <Button onClick={() => window.location.href = '/comparison'}>
                    Создать сравнение
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Уведомления
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-notifications">Email уведомления</Label>
                    <p className="text-sm text-gray-600">Получать уведомления на почту</p>
                  </div>
                  <input type="checkbox" id="email-notifications" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="price-alerts">Уведомления о ценах</Label>
                    <p className="text-sm text-gray-600">Получать уведомления об изменении цен</p>
                  </div>
                  <input type="checkbox" id="price-alerts" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="new-properties">Новые объекты</Label>
                    <p className="text-sm text-gray-600">Уведомления о новых объектах по вашим критериям</p>
                  </div>
                  <input type="checkbox" id="new-properties" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Настройки аккаунта
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="user-id">ID пользователя</Label>
                  <Input id="user-id" value={user.id} disabled />
                </div>
                
                <div>
                  <Label htmlFor="user-name">Имя пользователя</Label>
                  <Input id="user-name" value={user.name} disabled />
                </div>
                
                {user.roles && (
                  <div>
                    <Label htmlFor="user-roles">Роли</Label>
                    <Input id="user-roles" value={user.roles} disabled />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
