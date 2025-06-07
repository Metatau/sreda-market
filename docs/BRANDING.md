# SREDA Market - Брендинг и Логотип

## Официальный логотип

### Описание
Логотип SREDA Market состоит из двух элементов:
1. **Иконка**: TrendingUp из Lucide Icons на градиентном фоне
2. **Текст**: "SREDA Market" с градиентным эффектом

### Технические спецификации

#### Иконка
- **Размер**: 32x32px (w-8 h-8)
- **Фон**: Градиент от `#2563eb` (blue-600) до `#9333ea` (purple-600)
- **Скругление**: 8px (rounded-lg)
- **Иконка**: TrendingUp (Lucide Icons)
- **Цвет иконки**: Белый (#ffffff)
- **Размер иконки**: 20x20px (h-5 w-5)

#### Текст
- **Шрифт**: font-quantum
- **Размер**: text-xl (20px)
- **Вес**: font-bold (700)
- **Цвет**: Градиент от `#2563eb` (blue-600) до `#9333ea` (purple-600)
- **Эффект**: bg-clip-text с text-transparent

### CSS код
```css
.sreda-logo-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(to right, #2563eb, #9333ea);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sreda-logo-text {
  font-family: 'font-quantum', sans-serif;
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(to right, #2563eb, #9333ea);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}
```

### React компонент
```jsx
<Link href="/" className="flex items-center space-x-2">
  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
    <TrendingUpIcon className="h-5 w-5 text-white" />
  </div>
  <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-quantum">
    SREDA Market
  </span>
</Link>
```

### Использование
- **Основная навигация**: Navigation.tsx
- **Лендинг**: Landing.tsx
- **Фавикон**: client/favicon.svg (32x32px)
- **Иконка приложения**: client/app-icon.svg (512x512px)
- **HTML**: index.html с подключенными иконками

### Цветовая палитра
- **Основной синий**: #2563eb (rgb(37, 99, 235))
- **Основной фиолетовый**: #9333ea (rgb(147, 51, 234))
- **Белый текст**: #ffffff (rgb(255, 255, 255))

### Правила использования
1. Логотип должен использоваться только в указанных пропорциях
2. Градиент должен идти строго слева направо
3. Иконка TrendingUp не должна заменяться на другую
4. Текст "SREDA Market" пишется именно в таком регистре
5. При использовании на темном фоне сохранять белый цвет иконки

### Файлы логотипа
- **client/favicon.svg** - Фавикон 32x32px
- **client/app-icon.svg** - Иконка приложения 512x512px
- **docs/BRANDING.md** - Документация брендинга

### HTML Integration
```html
<!-- Favicon and App Icons -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="apple-touch-icon" href="/app-icon.svg" />
<meta name="theme-color" content="#2563eb" />
```