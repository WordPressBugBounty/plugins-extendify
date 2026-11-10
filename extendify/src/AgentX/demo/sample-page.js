// A made-up page for the page card's demo states, so their previews load nothing from the site.
export const SAMPLE_PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><style>
body{margin:0;font-family:Georgia,serif;color:#2b2118;background:#fbf6ee}
header{display:flex;justify-content:space-between;align-items:center;padding:20px 64px;background:#2b2118;color:#fbf6ee;font-family:Helvetica,Arial,sans-serif;font-size:14px;letter-spacing:.12em;text-transform:uppercase}
nav span{margin-left:32px}
.hero{padding:96px 64px 72px;background:linear-gradient(135deg,#7a3e1d,#c4703a);color:#fff}
.hero h1{margin:0 0 16px;font-size:64px;font-weight:400}
.hero p{margin:0;max-width:560px;font-size:20px;line-height:1.5}
main{padding:64px;display:grid;grid-template-columns:repeat(3,1fr);gap:32px}
.menu h2{margin:0 0 16px;font-size:28px;font-weight:400;border-bottom:1px solid #d9c9b4;padding-bottom:12px}
.item{display:flex;justify-content:space-between;gap:16px;margin:0 0 14px;font-size:17px}
.item small{display:block;color:#7a6a58;font-size:14px}
.cta{margin:0 64px 64px;padding:48px;background:#efe3d2;display:flex;justify-content:space-between;align-items:center}
.cta h2{margin:0 0 8px;font-weight:400;font-size:32px}
.cta p{margin:0;color:#5a4a3a}
.cta a{background:#2b2118;color:#fbf6ee;padding:14px 28px;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:14px;letter-spacing:.1em;text-transform:uppercase}
footer{padding:32px 64px;background:#2b2118;color:#d9c9b4;font-family:Helvetica,Arial,sans-serif;font-size:14px}
.band{padding:72px 64px}
.band h2{margin:0 0 32px;font-size:40px;font-weight:400}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:32px}
.steps div{background:#fff;padding:32px;border:1px solid #e6d9c6}
.steps b{display:block;margin:0 0 8px;font-size:22px;font-weight:400}
.steps p,.quotes p,.faq p{margin:0;font-size:17px;line-height:1.6;color:#5a4a3a}
.photos{display:grid;grid-template-columns:2fr 1fr 1fr;gap:16px;padding:0 64px 72px}
.photos div{height:260px;background:linear-gradient(160deg,#c4703a,#7a3e1d)}
.photos div:nth-child(2){background:linear-gradient(160deg,#e3c9a0,#b0824f)}
.photos div:nth-child(3){background:linear-gradient(160deg,#8a9a6b,#4f5f3a)}
.quotes{display:grid;grid-template-columns:repeat(2,1fr);gap:32px;background:#2b2118;color:#fbf6ee}
.quotes h2{grid-column:1/-1}
.quotes p{color:#e6d9c6;font-size:20px;font-style:italic}
.quotes span{display:block;margin-top:12px;font-style:normal;font-family:Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#c4a37a}
.faq div{border-top:1px solid #d9c9b4;padding:24px 0}
.faq b{display:block;margin:0 0 8px;font-size:20px;font-weight:400}
</style></head><body>
<header><strong>Palmer's Cafe</strong><nav><span>Menu</span><span>Catering</span><span>About</span><span>Contact</span></nav></header>
<section class="hero"><h1>Catering</h1><p>Pies, sandwiches and strong coffee for offices, birthdays and long Sunday lunches. Delivered warm anywhere in town, for ten guests or a hundred.</p></section>
<main>
<section class="menu"><h2>Breakfast</h2>
<p class="item"><span>Pastry platter<small>Croissants, scones, cinnamon rolls</small></span><span>$48</span></p>
<p class="item"><span>Egg sandwiches<small>A dozen, on toasted brioche</small></span><span>$60</span></p>
<p class="item"><span>Coffee box<small>Serves twelve</small></span><span>$32</span></p></section>
<section class="menu"><h2>Lunch</h2>
<p class="item"><span>Sandwich board<small>Turkey, ham and veggie</small></span><span>$95</span></p>
<p class="item"><span>Garden salad<small>Feeds eight</small></span><span>$40</span></p>
<p class="item"><span>Soup of the day<small>Two quarts</small></span><span>$36</span></p></section>
<section class="menu"><h2>Pies</h2>
<p class="item"><span>Cherry pie<small>Our famous one</small></span><span>$24</span></p>
<p class="item"><span>Apple crumble<small>With cinnamon crumb</small></span><span>$22</span></p>
<p class="item"><span>Pecan pie<small>Holidays only</small></span><span>$26</span></p></section>
</main>
<section class="band"><h2>How it works</h2><div class="steps">
<div><b>1. Tell us about it</b><p>Send the date, the head count and anything your guests can't eat. We answer within a day.</p></div>
<div><b>2. Pick a menu</b><p>We suggest a spread that fits your budget, and you change whatever you like.</p></div>
<div><b>3. We bring it warm</b><p>Delivery, set-up and pick-up are included anywhere within ten miles of the cafe.</p></div>
</div></section>
<section class="photos"><div></div><div></div><div></div></section>
<section class="band quotes"><h2>What our guests say</h2>
<p>“The cherry pie disappeared before the speeches started. Everyone asked who catered.”<span>Dana, office party for 40</span></p>
<p>“On time, still warm, and they remembered the two gluten-free guests without being reminded.”<span>Marcus, birthday lunch</span></p>
</section>
<section class="band faq"><h2>Questions</h2>
<div><b>How far ahead should I book?</b><p>A week is best. For under twenty guests, two days is usually enough.</p></div>
<div><b>Do you cater weekends?</b><p>Yes, Saturdays and Sundays from 8 in the morning until 4 in the afternoon.</p></div>
<div><b>Can you handle allergies?</b><p>We label every tray and keep gluten-free and nut-free dishes separate.</p></div>
<div><b>Is there a minimum order?</b><p>Ten guests, or $120 before delivery.</p></div>
</section>
<section class="cta"><div><h2>Planning an event?</h2><p>Tell us the date and the head count, and we'll put a menu together.</p></div><a href="#">Book catering</a></section>
<footer>Palmer's Cafe · 214 Main Street · 206-555-0100</footer>
</body></html>`;
