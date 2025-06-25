export interface ScheduleEvent {
  id: string;
  title: string;
  details: string | string[];
  time?: string;
  location: string;
  color: string;
  instructor?: string;
}

export interface ScheduleRow {
  id: string;
  instructor: string;
  city: string;
  regional: string;
  events: { [day: string]: ScheduleEvent[] };
}

export interface GlobalConfig {
  title: string;
  days: string[];
  currentWeek: {
    startDate: string;
    endDate: string;
  };
}

export interface Instructor {
  id: string;
  name: string;
  city: string;
  regional: string;
} 