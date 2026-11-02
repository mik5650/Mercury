// Mercury — sheet router
import { useApp } from "../ui/kit.jsx";
import { WeightSheet, MealSheet, TargetsSheet, SleepSheet, MeasureSheet, CardioSheet, RestDaySheet, TimerSheet } from "./logging.jsx";
import { ExerciseSheet, DaySheet, AddExerciseSheet, EditExerciseSheet, SummarySheet, ShareSheet } from "./workout.jsx";
import { ProgramsSheet, BuilderSheet } from "./programs.jsx";
import { ToolsSheet, SettingsSheet, YearSheet, PhotoCompareSheet, PhotoSheet } from "./tools.jsx";

const MAP = {
  weight: WeightSheet, meal: MealSheet, targets: TargetsSheet, sleep: SleepSheet, measure: MeasureSheet,
  cardio: CardioSheet, restDay: RestDaySheet, timer: TimerSheet,
  exercise: ExerciseSheet, day: DaySheet, addExercise: AddExerciseSheet, editExercise: EditExerciseSheet,
  summary: SummarySheet, share: ShareSheet,
  programs: ProgramsSheet, builder: BuilderSheet,
  tools: ToolsSheet, settings: SettingsSheet, year: YearSheet, photos: PhotoCompareSheet, photo: PhotoSheet,
};

export function SheetRouter({ sheet }) {
  const { close } = useApp();
  const C = MAP[sheet.kind];
  if (!C) return null;
  return <C key={sheet.kind + JSON.stringify(sheet.payload).length} payload={sheet.payload || {}} onClose={close} />;
}
