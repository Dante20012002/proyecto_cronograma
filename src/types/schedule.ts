export interface ScheduleEvent {
  id: string;
  title: string;
  details: string | string[];
  time?: string;
  location: string;
  color: string;
  instructor?: string;
  modalidad?: string;
}

export interface ScheduleRow {
  id: string;
  instructor: string;
  city: string;
  regional: string;
  events: { [day: string]: ScheduleEvent[] };
}

export interface GlobalConfig {
  title: string; // Título por defecto
  weekTitles: {
    [weekKey: string]: string; // weekKey será "YYYY-MM-DD" del lunes de la semana
  };
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