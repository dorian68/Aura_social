"""
patch_positioning.py — Aura landing page: Creator Superfan OS pivot
Targets i18n bundle UUID 1b3b1094-0104-4431-bf0f-bf9523a53125

Changes:
  EN + FR hero section: away from Instagram-first, toward Superfan Club
  - nav_cta, hero_badge, hero_primary, hero_secondary, hero_note, hero_sub
  - heroA_title, heroB_kicker, heroB_sub
  - os_eyebrow, os_h1
  - fcta_sub, fcta_btn
  - trust_line
  - prob_lede (update to cross-platform)
  + pilot section keys (new)
  - tk_disclaimer (downplay blockchain)
  - ft_disclaimer (update)
"""
import re, json, base64, gzip

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

ms = re.search(r'<script type="__bundler/manifest">', html)
me = html.find('</script>', ms.end())
manifest = json.loads(html[ms.end():me])
TARGET = '1b3b1094-0104-4431-bf0f-bf9523a53125'
entry = manifest[TARGET]
data = base64.b64decode(entry['data'])
if entry.get('compressed'): data = gzip.decompress(data)
src = data.decode('utf-8')

print(f"Bundle decoded: {len(src)} chars")

patches = [
    # ── EN nav ──────────────────────────────────────────────────────────────
    ('EN nav_cta',
     'nav_cta: "Analyze my Instagram"',
     'nav_cta: "Launch my Superfan Club"'),

    # ── EN hero ──────────────────────────────────────────────────────────────
    ('EN hero_badge',
     'hero_badge: "The superfan economy, revealed"',
     'hero_badge: "Creator Superfan OS — launch for free"'),

    ('EN hero_primary',
     'hero_primary: "Analyze my Instagram"',
     'hero_primary: "Launch my free Superfan Club"'),

    ('EN hero_secondary',
     'hero_secondary: "See the growth loop"',
     'hero_secondary: "See how it works"'),

    ('EN hero_note',
     'hero_note: "Free audit · No password · Public data only"',
     'hero_note: "Free forever · No card required · 5-minute setup"'),

    ('EN hero_sub',
     'hero_sub: "Aura analyzes your Instagram audience, identifies high-value fans, and helps you launch loyalty points, fan passes, rewards and AI-powered partner campaigns — without crypto complexity."',
     'hero_sub: "Aura gives those 100 superfans a reason to engage, share, show up, buy and bring others — with points, challenges, rewards and a fan community they earn status in."'),

    ('EN heroA_title',
     "heroA_title: \"Model your audience.<br><span class='hl'>Monetize your superfans.</span>\"",
     "heroA_title: \"Your next 100 superfans are worth<br><span class='hl'>more than 100,000 passive followers.</span>\""),

    ('EN heroB_kicker',
     'heroB_kicker: "From followers to superfans"',
     'heroB_kicker: "From followers to Superfan Club"'),

    ('EN heroB_sub',
     "heroB_sub: \"Most creators sit on a goldmine they can't see. AURA reveals the value hidden inside your community — and hands you the system to activate it.\"",
     "heroB_sub: \"Your most engaged fans — the ones who comment, share, show up and buy — are invisible in your follower count. Aura gives them a reason to identify themselves, earn status and activate your community.\""),

    # ── EN OS section ────────────────────────────────────────────────────────
    ('EN os_eyebrow',
     'os_eyebrow: "The Creator Monetization Operating System"',
     'os_eyebrow: "Creator Superfan OS"'),

    ('EN os_h1',
     "os_h1: \"Model your audience.<br><span class='lime'>Monetize</span><br>your superfans.\"",
     "os_h1: \"Turn your fans into<br>a rewarded<br><span class='lime'>growth community.</span>\""),

    # ── EN trust line ─────────────────────────────────────────────────────────
    ('EN trust_line',
     'trust_line: "Built for creators, managers, labels & agencies"',
     'trust_line: "Built for creators on Instagram, TikTok, YouTube, Twitch, Discord and live events"'),

    # ── EN final CTA ──────────────────────────────────────────────────────────
    ('EN fcta_sub',
     "fcta_sub: \"Run a free audit and meet the community you didn't know you owned.\"",
     'fcta_sub: "Launch a free Superfan Club and meet the community you didn\'t know you owned."'),

    ('EN fcta_btn',
     'fcta_btn: "Find them now"',
     'fcta_btn: "Launch my free club"'),

    # ── EN problem section ────────────────────────────────────────────────────
    ('EN prob_lede',
     'prob_lede: "You have attention. But attention doesn\'t automatically become income. Most creators don\'t know which followers are real superfans, what their community could generate, or what kind of paid experience to launch."',
     'prob_lede: "You have attention. But attention doesn\'t automatically become community or income. The 3% of your followers who would show up, refer friends and buy early access are invisible until something gives them a reason to step forward."'),

    # ── EN blockchain disclaimer: downplay ──────────────────────────────────
    ('EN tk_disclaimer',
     'tk_disclaimer: "AURA currently simulates a future tokenized loyalty layer. It is not connected to a live blockchain and tokens are not investments."',
     'tk_disclaimer: "Aura\'s loyalty points are operational. The tokenized layer is infrastructure in development and is not connected to a live blockchain. Not financial advice."'),

    ('EN ft_disclaimer',
     'ft_disclaimer: "AURA is a creator monetization platform. The tokenized loyalty layer is currently a simulation of future infrastructure and is not financial advice or an investment product."',
     'ft_disclaimer: "Aura is a creator community and loyalty platform. Points and rewards are operational. The tokenized layer is infrastructure in development. Not financial advice."'),

    # ── FR nav ───────────────────────────────────────────────────────────────
    ('FR nav_cta',
     'nav_cta: "Analyser mon Instagram"',
     'nav_cta: "Lancer mon Superfan Club"'),

    # ── FR hero ───────────────────────────────────────────────────────────────
    ('FR hero_badge',
     "hero_badge: \"L'économie des superfans, révélée\"",
     'hero_badge: "Creator Superfan OS — gratuit pour toujours"'),

    ('FR hero_primary',
     'hero_primary: "Analyser mon Instagram"',
     'hero_primary: "Lancer mon Superfan Club gratuit"'),

    ('FR hero_note',
     'hero_note: "Audit gratuit · Sans mot de passe · Données publiques uniquement"',
     'hero_note: "Gratuit pour toujours · Sans carte · 5 minutes pour lancer"'),

    ('FR hero_sub',
     "hero_sub: \"Aura analyse votre audience Instagram, identifie vos fans à forte valeur et vous aide à lancer points de fidélité, fan passes, récompenses et campagnes partenaires propulsées par l'IA — sans la complexité de la crypto.\"",
     'hero_sub: "Aura donne à vos 100 vrais fans une raison de s\'engager, de partager, de venir, d\'acheter et d\'amener d\'autres — avec des points, des défis, des récompenses et une communauté dont ils gagnent le statut."'),

    ('FR fcta_btn',
     'fcta_btn: "Les trouver maintenant"',
     'fcta_btn: "Lancer mon club gratuit"'),

    ('FR trust_line',
     'trust_line: "Conçu pour les créateurs, managers, labels & agences"',
     'trust_line: "Conçu pour les créateurs sur Instagram, TikTok, YouTube, Twitch, Discord et les événements live"'),
]

all_ok = True
for label, old, new in patches:
    count = src.count(old)
    if count == 0:
        print(f"  [FAIL] {label} — not found")
        all_ok = False
    elif count > 1:
        print(f"  [WARN] {label} — found {count} times, replacing first only")
        src = src.replace(old, new, 1)
    else:
        src = src.replace(old, new, 1)
        print(f"  [OK]   {label}")

# ── Pilot section (inject new keys before closing EN brace) ─────────────────
PILOT_ANCHOR = '    ft_tag: "Reveal. Connect. Reward."'
PILOT_NEW = (
    '    pilot_eyebrow: "Join the pilot",\n'
    '    pilot_title: "Be one of the first 20 creators to launch with Aura.",\n'
    '    pilot_sub: "We set up your club page, help you activate your first fans and find your first local partner campaign — free. In exchange, we ask for your feedback.",\n'
    '    pilot_cta: "Apply to the pilot",\n'
    '    pilot_f_platform: "Main platform",\n'
    '    pilot_f_handle: "Handle / username",\n'
    '    pilot_f_city: "City / region",\n'
    '    pilot_f_followers: "Approximate follower count",\n'
    '    pilot_f_niche: "Type of community (food, lifestyle, fitness, beauty...)",\n'
    '    pilot_f_rewards: "What rewards could you offer your fans?",\n'
    '    pilot_f_why: "Why do you want to join?",\n'
    '    pilot_f_submit: "Apply now",\n'
    '\n'
    '    ft_tag: "Reveal. Activate. Reward."'
)
if PILOT_ANCHOR in src:
    src = src.replace(PILOT_ANCHOR, PILOT_NEW, 1)
    print("  [OK]   EN pilot section + ft_tag update")
else:
    print("  [WARN] pilot anchor not found — skipping pilot injection")

# ── Verify critical strings ──────────────────────────────────────────────────
print("\nVerification:")
checks = [
    ("Superfan Club in nav CTA",         'nav_cta: "Launch my Superfan Club"'),
    ("Superfan OS badge",                 'hero_badge: "Creator Superfan OS'),
    ("No Instagram in hero_primary EN",   'hero_primary: "Launch my free Superfan Club"'),
    ("No-card hero note",                 'hero_note: "Free forever'),
    ("New hero sub",                      'reason to engage, share, show up'),
    ("heroA new title",                   'more than 100,000 passive followers'),
    ("OS h1 updated",                     'Turn your fans into'),
    ("cross-platform trust line",         'TikTok, YouTube, Twitch'),
    ("fcta_btn updated",                  'Launch my free club'),
    ("pilot section injected",            'pilot_eyebrow'),
    ("ft_tag updated",                    'Reveal. Activate. Reward.'),
    ("old nav_cta gone EN",               'nav_cta: "Analyze my Instagram"'),
    ("old hero_primary gone EN",          'hero_primary: "Analyze my Instagram"'),
]
for label, needle in checks:
    if label.startswith("old "):
        ok = needle not in src
        print(f"  [{'GONE' if ok else 'STILL HERE - FAIL'}] {label}")
    else:
        ok = needle in src
        print(f"  [{'OK' if ok else 'FAIL'}] {label}")
    all_ok = all_ok and ok

if not all_ok:
    print("\nERRORS — NOT saving")
    raise SystemExit(1)

# ── Re-encode ────────────────────────────────────────────────────────────────
encoded = gzip.compress(src.encode('utf-8'), compresslevel=9)
manifest[TARGET]['data'] = base64.b64encode(encoded).decode('ascii')
manifest[TARGET]['compressed'] = True
html = html[:ms.end()] + json.dumps(manifest, separators=(',', ':')) + html[me:]
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print(f"\nindex.html saved — {len(src)} chars")
