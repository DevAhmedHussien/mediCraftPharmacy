/**
 * The brief's import path for the scroll reveal.
 *
 * The implementation lives in ./Motion alongside Stagger and RevealWords,
 * because they share one easing constant, one viewport margin and one
 * reduced-motion rule, and splitting them across files is how two of them
 * end up drifting. Re-exported here so `@/components/motion/Reveal` works
 * and so new code has an obvious place to look.
 */
export { Reveal, FadeIn } from "./Motion";
