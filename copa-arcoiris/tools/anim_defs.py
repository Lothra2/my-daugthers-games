"""Frame descriptions for every animation sheet (8 frames per sheet, one row). See ART_BIBLE section 5."""
RUN8 = ("classic 8-frame run cycle, side view facing right: (1) right foot contact, leaning forward, arms swinging opposite to the legs; "
        "(2) down pose, body at its lowest; (3) passing pose, trailing leg lifted under the body; (4) up pose, body at its highest, pushing off; "
        "(5) left foot contact; (6) down pose; (7) passing pose; (8) up pose")

HUMAN = {
 "run": RUN8,
 "walk_idle": ("(1) walk contact, (2) walk down, (3) walk passing, (4) walk contact on the other foot, (5) walk down, (6) walk passing, "
               "all six side view facing right with relaxed swinging arms; (7) standing idle breathing in, shoulders slightly raised, front three-quarter view; "
               "(8) standing idle breathing out, shoulders relaxed, front three-quarter view"),
 "jump_pickup": ("side view facing right: (1) crouching to jump, knees bent, arms back; (2) rising in the air, legs tucked slightly, arms up; "
                 "(3) top of the jump, body stretched with arms up; (4) falling, legs reaching down, arms out; (5) landing, squashed low with knees deeply bent; "
                 "(6) bending down to pick something up, hands reaching toward the ground; (7) grabbing an object at ground level, bent over; "
                 "(8) standing back up lifting both hands to chest height, no object drawn"),
 "carry_throw": ("side view facing right: (1) standing still holding both hands together in front of the chest as if carrying a ball, no ball drawn; "
                 "(2) to (5) four-frame run cycle while holding both hands together in front of the chest, no ball drawn, leaning slightly back; "
                 "(6) winding up to throw, one arm pulled far back, body twisted; (7) release, arm swung forward and extended, body leaning forward; "
                 "(8) follow-through, arm across the body and weight on the front foot"),
 "swim_push": ("side view facing right: (1) to (4) four-frame swimming stroke, only head and shoulders above the water line, arms alternating overhead, "
               "the lower body hidden below a flat water line drawn as a simple light blue band; (5) winding up a playful shove, arms pulled back; "
               "(6) shoving forward with both hands extended; (7) recovering, arms coming back; "
               "(8) mid-air swing with a short foam pool noodle held in both hands, arms raised overhead, body in a small hop"),
 "hit_tumble": ("side view facing right: (1) wobbling off-balance, arms windmilling, surprised funny face; (2) stumbling back, one leg lifted; "
                "(3) flying through the air backwards, spinning, legs up, dizzy comic face; (4) mid-somersault upside down, comic stars around the head; "
                "(5) landed sitting on the ground with legs out, dizzy swirl eyes, small stars circling; (6) lying flat on the back laughing with stars; "
                "(7) getting up, pushing off the ground with one hand; (8) sitting inside a large translucent shiny soap bubble, waving happily"),
 "power_celebrate": ("side view facing right: (1) charging a power, crouching with fists clenched and a glow; (2) releasing the power, one arm thrust forward, "
                     "body leaning, big determined smile; (3) holding the power pose, body stretched forward; (4) recovering, standing up with a grin; "
                     "(5) celebration frame 1: arms raised up in victory, open-mouth laugh; (6) celebration frame 2: jumping with both fists in the air; "
                     "(7) celebration frame 3: landing in a happy wide pose; (8) celebration frame 4: blowing a kiss and waving"),
}
DOG = {
 "run": ("classic 8-frame gallop cycle of a running dog, side view facing right, all four legs visible: (1) front legs reaching forward and back legs pushing, "
         "stretched out; (2) all four legs in the air, stretched; (3) legs gathering under the body; (4) legs fully tucked under the body; "
         "(5) back legs landing; (6) front legs landing; (7) pushing off; (8) stretched again. Ears flopping, tongue out"),
 "walk_idle": ("(1) to (6) six-frame trot cycle, side view facing right, legs moving in diagonal pairs, head bobbing, tail wagging; "
               "(7) sitting happily facing right with the tail wagging to one side; (8) sitting with the tail wagging to the other side"),
 "jump_fetch": ("side view facing right: (1) crouching low on the haunches to jump; (2) leaping up, front legs reaching; (3) top of the jump, body stretched out, ears up; "
                "(4) falling, front legs reaching down; (5) landing, squashed low with all four legs bent; (6) lowering the head to the ground to pick something up; "
                "(7) mouth closed on a pick-up at ground level, no object drawn; (8) lifting the head back up proudly with the mouth closed"),
 "carry_toss": ("side view facing right: (1) to (6) six-frame run cycle with the head held high and the mouth slightly closed as if carrying a ball, no ball drawn; "
                "(7) head thrown back, winding up to toss; (8) head flicked forward, mouth open, releasing the toss"),
 "swim_push": ("side view facing right, a dog swimming doggy-paddle: (1) to (4) four-frame paddling, only the head and the top of the back above a flat light blue "
               "water line, legs paddling below; (5) pulling the head back to bump something; (6) bumping forward with the head and nose; (7) recovering; "
               "(8) a small hop in the air with the front paws up, playful"),
 "hit_tumble": ("side view facing right: (1) wobbling off-balance with a surprised funny face; (2) stumbling back; (3) flying through the air upside down, dizzy; "
                "(4) rolling on its back with legs up; (5) lying on its back with the tongue out and comic stars around the head; (6) flopped on the belly, dizzy eyes; "
                "(7) shaking its body to get up; (8) sitting inside a large translucent shiny soap bubble, looking happy"),
 "zoom_celebrate": ("side view facing right: (1) to (4) four-frame super-fast zoomies run with the ears blown back and speed lines behind; "
                    "(5) to (8) four frames of happily chasing its own tail in a circle, tail wagging, tongue out, three-quarter view"),
}
