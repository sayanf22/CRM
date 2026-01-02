import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Clock, AlertTriangle } from "lucide-react";

interface CountdownTimerProps {
  targetDate: string;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export default function CountdownTimer({ targetDate, className }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(targetDate).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setIsOverdue(true);
        // Calculate overdue time
        const overdueDiff = Math.abs(difference);
        return {
          days: Math.floor(overdueDiff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((overdueDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((overdueDiff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((overdueDiff % (1000 * 60)) / 1000),
          total: overdueDiff
        };
      }

      setIsOverdue(false);
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
        total: difference
      };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  // Calculate progress percentage (for visual indicator)
  const getUrgencyLevel = () => {
    if (isOverdue) return 'overdue';
    if (timeLeft.total <= 1000 * 60 * 60) return 'urgent'; // Less than 1 hour
    if (timeLeft.total <= 1000 * 60 * 60 * 24) return 'soon'; // Less than 24 hours
    return 'normal';
  };

  const urgency = getUrgencyLevel();

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono transition-all duration-300",
      urgency === 'overdue' && "bg-red-100 text-red-700 animate-pulse",
      urgency === 'urgent' && "bg-orange-100 text-orange-700",
      urgency === 'soon' && "bg-yellow-100 text-yellow-700",
      urgency === 'normal' && "bg-blue-50 text-blue-700",
      className
    )}>
      {isOverdue ? (
        <AlertTriangle className="w-3 h-3" />
      ) : (
        <Clock className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
      )}
      
      <div className="flex items-center gap-0.5">
        {isOverdue && <span className="text-[10px] mr-1">OVERDUE</span>}
        
        {timeLeft.days > 0 && (
          <>
            <TimeUnit value={timeLeft.days} label="d" urgency={urgency} />
            <span className="opacity-50">:</span>
          </>
        )}
        
        <TimeUnit value={timeLeft.hours} label="h" urgency={urgency} />
        <span className={cn("opacity-50", urgency !== 'normal' && "animate-pulse")}>:</span>
        <TimeUnit value={timeLeft.minutes} label="m" urgency={urgency} />
        <span className={cn("opacity-50", urgency !== 'normal' && "animate-pulse")}>:</span>
        <TimeUnit value={timeLeft.seconds} label="s" urgency={urgency} isSeconds />
      </div>
    </div>
  );
}

interface TimeUnitProps {
  value: number;
  label: string;
  urgency: string;
  isSeconds?: boolean;
}

function TimeUnit({ value, label, urgency, isSeconds }: TimeUnitProps) {
  return (
    <span className={cn(
      "tabular-nums transition-all duration-300",
      isSeconds && urgency !== 'normal' && "animate-pulse"
    )}>
      {value.toString().padStart(2, '0')}
      <span className="text-[9px] opacity-70">{label}</span>
    </span>
  );
}
