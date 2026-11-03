# Developer Journey — character poses

The section shows six pose images in `story/assets/`. Each image fades in at its stage, so a new file
with the same name replaces a pose. No code changes are needed.

## What ships today

Six high-resolution illustrations you supplied, all in the black overshirt, white tee and watch.
Each is cropped to 820 × 1009 px and saved as WebP. On screen it fills the right side of each stage,
with a soft left edge that blends it into the room.

| File | Used for |
| --- | --- |
| pose-thinking.webp | The idea (first part), The plan |
| pose-excited.webp | The idea (when it lands), The fix (second half), The release (on success) |
| pose-coding.webp | The code, The bug (first moments), The tests, The release (while deploying) |
| pose-debugging.webp | The bug |
| pose-solved.webp | The fix (the moment it clicks) |
| pose-relaxed.webp | Shipped |

The two hoodie images were left out so the outfit stays the same in every stage.

## Spec for high-resolution replacements

- About 1000 × 1230 px or larger, any background (the page crops to the face and fades the left edge).
- Head and shoulders to mid-chest, with the bottom edge cut straight (the desk covers it).
  The head sits in the upper third.
- The camera is identical in every pose: eye level, about 15° off front, same distance.
- Lighting: cool violet/blue monitor light from the front-left, a warm lamp rim light from the left.
- Keep the files under about 80 KB each (WebP quality 80).

## Prompt (use your reference portrait plus the character sheet as image references, same seed)

> Anime-inspired semi-realistic illustration of the same young South Asian man in every image:
> short dark wavy hair with a faded undercut, full well-groomed black beard, warm brown eyes;
> wearing a black zip hoodie with a small white "</>" print on the chest over a white t-shirt,
> black smartwatch on the left wrist. Head-and-shoulders crop to mid-chest, eye-level camera,
> slight three-quarter angle, identical framing and scale. Soft violet monitor light from the
> front-left, warm desk-lamp rim light, dark navy background (#181d42), clean line art, cel
> shading, cinematic, high detail, no text, no speech marks.

Add one pose line per image:

1. pose-thinking — hand on chin, eyes looking up and to the side, thoughtful half-smile.
2. pose-excited — eyes closed, wide grin, one fist raised near the shoulder in a small "yes".
3. pose-coding — looking down and slightly left at a screen, focused brow, lips pressed, shoulders forward.
4. pose-debugging — one hand pushed into his hair, eyes shut, frustrated frown, head tilted down.
5. pose-solved — eyes wide with realisation, eyebrows raised, mouth slightly open, upright.
6. pose-relaxed — leaning back, both hands behind his head, eyes closed, calm satisfied smile.
7. (optional) pose-testing — calm and reviewing, chin slightly raised, eyes scanning, faint smile.
   To use it, add `<img class="pose" data-p="testing" …>` and map stage 5 to `'testing'` in `story.js`.
