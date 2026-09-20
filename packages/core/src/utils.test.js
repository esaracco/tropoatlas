import {
  cleanText,
  normalize,
  formatRating,
  cleanPrice,
  extractTag,
  updateTag,
} from "./utils"
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

it("cleanPrice sanitizes prices with dots, commas, currency symbols, or raw numbers", () => {
  expect(cleanPrice("14,99")).toBe("14.99")
  expect(cleanPrice("14.99")).toBe("14.99")
  expect(cleanPrice("14,99 €")).toBe("14.99")
  expect(cleanPrice("€ 14.99")).toBe("14.99")
  expect(cleanPrice("  19,50  ")).toBe("19.50")
  expect(cleanPrice(15)).toBe("15")
  expect(cleanPrice("15")).toBe("15")
  expect(cleanPrice(15.99)).toBe("15.99")
  expect(cleanPrice(null)).toBe("")
  expect(cleanPrice(undefined)).toBe("")
  expect(cleanPrice("")).toBe("")
  expect(cleanPrice("invalid")).toBe("")
})

it("extractTag extracts tagged values from freeform text", () => {
  const text = "place: 42, price: 19.99 €, rating: 5, categories: Sci-Fi"
  expect(extractTag(text, "place")).toBe("42")
  expect(extractTag(text, "price")).toBe("19.99 €")
  expect(extractTag(text, "rating")).toBe("5")
  expect(extractTag(text, "categories")).toBe("Sci-Fi")
  expect(extractTag(text, "nonexistent")).toBeUndefined()
  expect(extractTag("", "place")).toBeUndefined()
  expect(extractTag(null, "place")).toBeUndefined()
  expect(extractTag(undefined, "place")).toBeUndefined()

  // Newline and semicolon delimited tags
  const multiline = "place: 10\nrating: 4; categories: Roman"
  expect(extractTag(multiline, "place")).toBe("10")
  expect(extractTag(multiline, "rating")).toBe("4")
  expect(extractTag(multiline, "categories")).toBe("Roman")
})

it("updateTag updates, appends, and removes tagged values", () => {
  // Append to empty text
  expect(updateTag("", "place", "12")).toBe("place: 12")

  // Append to existing text without trailing comma
  expect(updateTag("Existing note", "place", "12")).toBe(
    "Existing note, place: 12",
  )

  // Append to existing text with trailing comma
  expect(updateTag("Existing note,", "place", "12")).toBe(
    "Existing note, place: 12",
  )

  // Update existing tag in place
  const text = "place: 10, price: 15 €, rating: 3"
  expect(updateTag(text, "place", "20")).toBe(
    "place: 20, price: 15 €, rating: 3",
  )
  expect(updateTag(text, "rating", "5")).toBe(
    "place: 10, price: 15 €, rating: 5",
  )

  // Remove existing tag when value is empty or null
  expect(updateTag(text, "rating", "")).toBe("place: 10, price: 15 €")
  expect(updateTag(text, "place", null)).toBe("price: 15 €, rating: 3")
  expect(updateTag(text, "price", undefined)).toBe("place: 10, rating: 3")
})
