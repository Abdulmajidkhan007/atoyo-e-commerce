#!/bin/bash
# Atoyo e-commerce — Claude Code (web) SessionStart hook.
#
# Nega kerak: Claude Code'ning web muhitidagi konteyner har safar qayta
# ishga tushganda (recycle) lokal git HEAD eski commit'ga qaytadi va
# node_modules o'chib ketadi. Bu hook har sessiya boshida muhitni
# avtomatik tiklaydi — shunda tsc/eslint/build darhol ishlaydi.
set -euo pipefail

# Faqat remote (web) muhitida ishlaymiz; lokal Claude Code'ga tegmaymiz.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# 1) Lokal branch'ni origin bilan tenglashtirish (ff-only — xavfsiz:
#    ish daraxti divergent yoki oldinda bo'lsa hech narsa o'zgartirmaydi,
#    faqat recycle'dan keyin orqada qolganda oldinga suradi).
BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || echo '')"
if [ -n "$BRANCH" ]; then
  git fetch origin "$BRANCH" 2>/dev/null && \
    git merge --ff-only "origin/$BRANCH" 2>/dev/null || true
fi

# 2) node_modules recycle'da yo'qoladi — kalit paketlar yo'q bo'lsa o'rnatamiz.
#    (npm ci emas, npm install — konteyner keshidan foydalanadi.)
if [ ! -d node_modules/next ] || [ ! -d node_modules/swiper ]; then
  npm install
fi

# 3) vitest.config.ts mobile/src/version.test.ts ni ham oladi, u esa
#    mobile/tsconfig.json orqali @react-native/typescript-config ga
#    tayanadi — shu paket bo'lmasa `npm test` "TSConfckParseError" bilan
#    yiqiladi (docs/AUDIT.md 2.4). CI mobile'da alohida `npm ci` qiladi
#    (.github/workflows/ci.yml), bu hook esa shu paritetni recycle'dan
#    keyin ham saqlaydi.
if [ ! -d mobile/node_modules/@react-native/typescript-config ]; then
  (cd mobile && npm install --no-audit --no-fund) || true
fi
