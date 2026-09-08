/**
 * Compute how many viewport-heights the user has scrolled into the arrow section.
 * Uses the DOM element with id="arrow-section" as the reference.
 *
 * Returns a large negative number if the element doesn't exist,
 * so all scroll-range checks naturally evaluate to "not yet".
 */
export function getArrowSectionVH(): number {
  const el = document.getElementById('arrow-section')
  if (!el) return -100
  const rect = el.getBoundingClientRect()
  return -rect.top / window.innerHeight
}
