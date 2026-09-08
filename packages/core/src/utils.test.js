import { cleanText, normalize } from "./utils"
import { it, expect } from "vitest"

it("Strings normalization", () => {
  expect(normalize("Hubert Félix Thiéfaine")).toBe("ubert_felik_thiefene")
  expect(normalize("DIDIER")).toBe("didie")
  expect(normalize("Maddie Ashman")).toBe("madie_ashman")
  expect(normalize("Symphony No. 5")).toBe("simfoni_no_5")
  expect(normalize("Björk Guðmundsdóttir")).toBe("bjork_gumundsdotir")
  expect(normalize("L' entraide")).toBe("lentrede")
  expect(normalize("L’ entraide")).toBe("lentrede")
  expect(normalize("L'entraide")).toBe("lentrede")
  expect(normalize("L' Être et le Néant")).toBe("letre_et_le_nint")
  expect(normalize("L'Être et le Néant")).toBe("letre_et_le_nint")
})

it("cleanText cleans typographical glitches and spaces", () => {
  expect(cleanText("L' entraide")).toBe("L'entraide")
  expect(cleanText("L’ entraide")).toBe("L'entraide")
  expect(cleanText("L’entraide")).toBe("L'entraide")
  expect(cleanText("  Pierre   Kropotkine  ")).toBe("Pierre Kropotkine")
  expect(cleanText("D'   Alembert")).toBe("D'Alembert")
  expect(cleanText("O'   Connor")).toBe("O'Connor")
  expect(cleanText(null)).toBe(null)
  expect(cleanText(undefined)).toBe(undefined)
})
