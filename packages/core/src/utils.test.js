import { normalize } from "./utils"
import { it, expect } from "vitest"

it("Strings normalization", () => {
  expect(normalize("Hubert Félix Thiéfaine")).toBe("ubert_felik_thiefene")
  expect(normalize("DIDIER")).toBe("didie")
  expect(normalize("Maddie Ashman")).toBe("madie_ashman")
  expect(normalize("Symphony No. 5")).toBe("simfoni_no_5")
  expect(normalize("Björk Guðmundsdóttir")).toBe("bjork_gumundsdotir")
})
