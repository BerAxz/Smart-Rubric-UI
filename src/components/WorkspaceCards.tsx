import { ArrowRight, BookOpen, MessageSquareText } from "lucide-react";
import { Link } from "react-router-dom";
import type { components } from "../api/generated";
import { formatDate } from "../utils/format";

type Course = components["schemas"]["CourseRead"];
type Evaluation = components["schemas"]["EvaluationRead"];

export function CourseTile({ course }: { course: Course }) {
  return (
    <Link className="course-tile" to={`/app/courses/${course.id}`}>
      <div className="course-tile__top">
        <span className="course-symbol">{course.name.slice(0, 1).toLocaleUpperCase("es-CL")}</span>
        <span className="course-tile__category">Curso</span>
      </div>
      <strong className="course-tile__name">{course.name}</strong>
      <div className="course-tile__metadata">
        <span>{course.learning_outcomes.length} objetivos · {course.contents.length} contenidos</span>
        <small>Actualizado {formatDate(course.updated_at)}</small>
      </div>
    </Link>
  );
}

export function ConversationRow({
  evaluation,
  courseName,
  compact = false,
}: {
  evaluation: Evaluation;
  courseName: string;
  compact?: boolean;
}) {
  return (
    <Link className={`conversation-row ${compact ? "conversation-row--compact" : ""}`} to={`/app/evaluations/${evaluation.id}/chat`}>
      <span className="conversation-row__icon"><MessageSquareText size={17} aria-hidden="true" /></span>
      <span className="conversation-row__body">
        <strong>{evaluation.name}</strong>
        <small>{courseName} · {formatDate(evaluation.updated_at)}</small>
      </span>
      <span className="conversation-row__action">Abrir <ArrowRight size={15} aria-hidden="true" /></span>
    </Link>
  );
}

export function EvaluationTile({ evaluation, courseName }: { evaluation: Evaluation; courseName: string }) {
  return (
    <Link className="evaluation-tile" to={`/app/evaluations/${evaluation.id}`}>
      <span className="evaluation-tile__icon"><BookOpen size={18} aria-hidden="true" /></span>
      <span className="evaluation-tile__body">
        <strong>{evaluation.name}</strong>
        <small>{courseName} · {evaluation.achievement_levels.length} niveles · Actualizada {formatDate(evaluation.updated_at)}</small>
      </span>
      <ArrowRight size={16} aria-hidden="true" />
    </Link>
  );
}
