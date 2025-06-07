import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  TrendingUp, 
  MapPin, 
  BarChart3, 
  Activity,
  DollarSign,
  Layers
} from 'lucide-react';

interface DemoStep {
  id: string;
  title: string;
  description: string;
  duration: number;
  visual: React.ReactNode;
}

export function MapAnalyticsDemo() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const demoSteps: DemoStep[] = [
    {
      id: 'heatmap-price',
      title: 'Тепловая карта цен',
      description: 'Визуализация стоимости недвижимости по районам',
      duration: 3000,
      visual: (
        <div className="relative h-32 bg-gradient-to-r from-blue-200 via-yellow-300 to-red-400 rounded-lg flex items-center justify-center">
          <div className="absolute inset-0 opacity-30">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="absolute w-6 h-6 bg-white rounded-full animate-pulse"
                style={{
                  left: `${20 + (i % 5) * 15}%`,
                  top: `${20 + Math.floor(i / 5) * 20}%`,
                  animationDelay: `${i * 200}ms`
                }}
              />
            ))}
          </div>
          <DollarSign className="h-8 w-8 text-white z-10" />
        </div>
      )
    },
    {
      id: 'roi-analysis',
      title: 'ROI анализ',
      description: 'Оценка инвестиционной привлекательности объектов',
      duration: 3000,
      visual: (
        <div className="relative h-32 bg-gradient-to-r from-green-200 via-emerald-300 to-green-500 rounded-lg flex items-center justify-center">
          <div className="grid grid-cols-4 gap-2 p-4">
            {[85, 92, 76, 88].map((value, i) => (
              <div key={i} className="text-center">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-xs font-bold text-green-700 mb-1">
                  {value}
                </div>
                <Progress value={value} className="h-1" />
              </div>
            ))}
          </div>
          <TrendingUp className="absolute top-2 right-2 h-6 w-6 text-white" />
        </div>
      )
    },
    {
      id: 'area-selection',
      title: 'Выделение областей',
      description: 'Интерактивные инструменты для анализа районов',
      duration: 3000,
      visual: (
        <div className="relative h-32 bg-gray-100 rounded-lg flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 200 100">
            <defs>
              <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="5" cy="5" r="1" fill="#cbd5e1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
            <polygon 
              points="50,20 120,15 140,40 130,70 60,75 40,50" 
              fill="rgba(59, 130, 246, 0.2)" 
              stroke="#3b82f6" 
              strokeWidth="2" 
              strokeDasharray="4,2"
              className="animate-pulse"
            />
          </svg>
          <MapPin className="absolute top-2 left-2 h-6 w-6 text-blue-600" />
        </div>
      )
    },
    {
      id: 'statistics',
      title: 'Статистический анализ',
      description: 'Детальная аналитика по выбранным областям',
      duration: 3000,
      visual: (
        <div className="h-32 bg-slate-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 h-full">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Ликвидность</span>
              </div>
              <Progress value={78} className="h-2" />
              <span className="text-xs text-gray-500">78/100</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Рост цен</span>
              </div>
              <Progress value={65} className="h-2" />
              <span className="text-xs text-gray-500">+12.5%</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + (100 / (demoSteps[currentStep].duration / 100));
          
          if (newProgress >= 100) {
            setCurrentStep(prevStep => {
              const nextStep = (prevStep + 1) % demoSteps.length;
              if (nextStep === 0) {
                setIsPlaying(false);
              }
              return nextStep;
            });
            return 0;
          }
          
          return newProgress;
        });
      }, 100);
    }

    return () => clearInterval(interval);
  }, [isPlaying, currentStep, demoSteps]);

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    setProgress(0);
  };

  const currentDemo = demoSteps[currentStep];

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            Демо аналитики
          </CardTitle>
          <Badge variant="secondary">
            {currentStep + 1}/{demoSteps.length}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Demo Visualization */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">{currentDemo.title}</h4>
            <div className="text-xs text-gray-500">
              {Math.round(progress)}%
            </div>
          </div>
          
          {currentDemo.visual}
          
          <p className="text-sm text-gray-600">{currentDemo.description}</p>
          
          <Progress value={progress} className="h-2" />
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePlay}
            className="flex-1"
          >
            {isPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            {isPlaying ? 'Пауза' : 'Запуск'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Steps Navigator */}
        <div className="grid grid-cols-4 gap-1">
          {demoSteps.map((step, index) => (
            <div
              key={step.id}
              className={`h-2 rounded-sm cursor-pointer transition-colors ${
                index === currentStep 
                  ? 'bg-blue-600' 
                  : index < currentStep 
                    ? 'bg-blue-300' 
                    : 'bg-gray-200'
              }`}
              onClick={() => {
                setCurrentStep(index);
                setProgress(0);
                setIsPlaying(false);
              }}
              title={step.title}
            />
          ))}
        </div>

        {/* Features List */}
        <div className="pt-2 border-t space-y-2">
          <h5 className="text-sm font-medium text-gray-700">Возможности:</h5>
          <div className="text-xs text-gray-600 space-y-1">
            <div>• 10+ режимов тепловой карты</div>
            <div>• Инструменты выделения областей</div>
            <div>• Статистика и сравнительный анализ</div>
            <div>• Измерение расстояний и площадей</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}