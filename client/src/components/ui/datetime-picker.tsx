import { useState, useEffect } from "react";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Label } from "./label";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function DateTimePicker({ value, onChange, className }: DateTimePickerProps) {
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("12");
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState<"AM" | "PM">("AM");

  // Parse initial value
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setDate(`${year}-${month}-${day}`);
      
      let hours = d.getHours();
      const mins = d.getMinutes();
      
      if (hours === 0) {
        setHour("12");
        setPeriod("AM");
      } else if (hours === 12) {
        setHour("12");
        setPeriod("PM");
      } else if (hours > 12) {
        setHour(String(hours - 12));
        setPeriod("PM");
      } else {
        setHour(String(hours));
        setPeriod("AM");
      }
      
      setMinute(String(mins).padStart(2, '0'));
    }
  }, []);

  // Build ISO string when any value changes
  useEffect(() => {
    if (date) {
      let hours = parseInt(hour);
      
      if (period === "AM") {
        if (hours === 12) hours = 0;
      } else {
        if (hours !== 12) hours += 12;
      }
      
      const mins = parseInt(minute);
      const [year, month, day] = date.split('-').map(Number);
      
      const d = new Date(year, month - 1, day, hours, mins);
      onChange(d.toISOString());
    }
  }, [date, hour, minute, period]);

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const minutes = ["00", "15", "30", "45"];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Date Input */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Date</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full"
        />
      </div>
      
      {/* Time Input */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Time</Label>
        <div className="flex items-center gap-2">
          {/* Hour */}
          <div className="flex-1">
            <Input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={hour}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 12)) {
                  setHour(val);
                }
              }}
              onBlur={() => {
                if (!hour || parseInt(hour) < 1) setHour("12");
                if (parseInt(hour) > 12) setHour("12");
              }}
              placeholder="HH"
              className="text-center"
            />
          </div>
          
          <span className="text-lg font-bold text-muted-foreground">:</span>
          
          {/* Minute */}
          <div className="flex-1">
            <Input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={minute}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
                  setMinute(val.padStart(2, '0'));
                }
              }}
              onBlur={() => {
                if (!minute) setMinute("00");
                setMinute(minute.padStart(2, '0'));
              }}
              placeholder="MM"
              className="text-center"
            />
          </div>
          
          {/* AM/PM Toggle */}
          <div className="flex rounded-md border overflow-hidden">
            <button
              type="button"
              onClick={() => setPeriod("AM")}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors",
                period === "AM" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-background hover:bg-muted"
              )}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => setPeriod("PM")}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors border-l",
                period === "PM" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-background hover:bg-muted"
              )}
            >
              PM
            </button>
          </div>
        </div>
      </div>
      
      {/* Quick Time Buttons */}
      <div className="flex flex-wrap gap-1">
        {["9:00 AM", "12:00 PM", "2:00 PM", "5:00 PM", "7:00 PM"].map((time) => {
          const [t, p] = time.split(' ');
          const [h, m] = t.split(':');
          return (
            <button
              key={time}
              type="button"
              onClick={() => {
                setHour(h);
                setMinute(m);
                setPeriod(p as "AM" | "PM");
              }}
              className="px-2 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 transition-colors"
            >
              {time}
            </button>
          );
        })}
      </div>
    </div>
  );
}
