import { cleanText, normalize, formatRating } from "./utils"
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

it("formatRating formats ratings without trailing zero decimals for whole numbers", () => {
  expect(formatRating(4)).toBe("4")
  expect(formatRating(4.0)).toBe("4")
  expect(formatRating(4.5)).toBe("4.5")
  expect(formatRating(4.56)).toBe("4.56")
  expect(formatRating(4.567)).toBe("4.57")
  expect(formatRating(8, 1)).toBe("8")
  expect(formatRating(8.0, 1)).toBe("8")
  expect(formatRating(8.4, 1)).toBe("8.4")
  expect(formatRating(null)).toBe("")
  expect(formatRating(undefined)).toBe("")
  expect(formatRating(NaN)).toBe("")
})
