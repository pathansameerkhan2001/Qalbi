import { getIngredients } from "@/lib/store/content";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { IngredientCard } from "./ingredient-cards";

export async function IngredientsPreview() {
  const ingredients = await getIngredients();
  return (
    <section aria-labelledby="ingredients-heading" className="py-10 sm:py-14">
      <Container>
        <SectionHeading
          id="ingredients-heading"
          eyebrow="Ingredients"
          title="Know What Goes on Your Skin"
          description="Botanicals at the heart of the QALBI ritual."
          action={{ label: "Explore Ingredients", href: "/ingredients" }}
        />
        <ul className="scroll-row -mx-4 gap-3 px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0">
          {ingredients.map((ingredient) => (
            <li key={ingredient.slug} className="w-[44%] shrink-0 sm:w-auto">
              <IngredientCard ingredient={ingredient} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
