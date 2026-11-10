import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RubricPayload } from "../utils/rubric";
import { RubricInChat } from "./ChatPage";

const baseRubric: RubricPayload = {
  title: "Rúbrica de prueba",
  criteria: [{
    criterion: "Argumentación basada en evidencia",
    description: "Selecciona evidencia pertinente y la conecta con su conclusión.",
    levels: {
      Inicial: "Presenta una afirmación sin evidencia.",
      Logrado: "Conecta evidencia pertinente con la conclusión.",
    },
    scores: { Inicial: 0, Logrado: 2 },
  }],
};

function renderRubric(rubric: RubricPayload) {
  return render(
    <RubricInChat
      rubric={rubric}
      evaluationName="Evaluación de prueba"
      summary="1 criterio · 2 niveles · 2 puntos posibles"
      showExport={false}
      exporting={null}
      onExport={vi.fn()}
    />,
  );
}

describe("RubricInChat", () => {
  it("shows criterion and achievement levels without a separate observation column", () => {
    renderRubric(baseRubric);
    const table = screen.getByRole("table");

    expect(within(table).getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Criterio",
      "Inicial",
      "Logrado",
    ]);
    expect(within(table).queryByRole("columnheader", { name: "Qué observar" })).not.toBeInTheDocument();
    expect(within(table).getByRole("rowheader", { name: /Argumentación basada en evidencia/ })).toHaveTextContent(
      "Selecciona evidencia pertinente y la conecta con su conclusión.",
    );
    expect(table.querySelectorAll("td[data-level]")).toHaveLength(2);
    expect(table.querySelectorAll(".rubric-table__mobile-score")).toHaveLength(2);
  });

  it("renders a current criterion that omits the legacy description", () => {
    renderRubric({
      ...baseRubric,
      criteria: [{
        criterion: "Claridad",
        levels: { Inicial: "La respuesta no se entiende.", Logrado: "La respuesta se entiende." },
      }],
    });

    expect(screen.getByRole("rowheader", { name: "Claridad" })).toBeInTheDocument();
    expect(screen.getByText("La respuesta se entiende.")).toBeInTheDocument();
  });
});
