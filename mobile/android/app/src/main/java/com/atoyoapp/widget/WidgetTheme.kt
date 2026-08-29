package com.atoyoapp.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.ui.graphics.Color

/**
 * Widget rangi HAR DOIM brend (Deep Navy + gold) - telefon mavzusiga
 * qarab o'zgarmaydi.
 *
 * Nega: widget bosh ekranda, foydalanuvchining o'z fon rasmi ustida
 * turadi. Tizim mavzusiga ergashganda u yorug' rejimda OQ QUTI bo'lib
 * qolardi va ilovaga aloqasi bilinmasdi. Brend rangi esa har qanday
 * fonda o'qiladi va ilova sarlavhasi bilan bir xil ko'rinadi
 * (`mobile/src/theme.tsx` dagi NAVY/GOLD qiymatlari).
 */
object WidgetColors {
    data class Palette(
        val bg: Color,
        val text: Color,
        val muted: Color,
        val accent: Color,
    )

    private val BRAND = Palette(
        bg = Color(0xFF072D40),
        text = Color(0xFFFFFFFF),
        muted = Color(0xFF9FC0D0),
        accent = Color(0xFFDCC09A),
    )

    fun forContext(@Suppress("UNUSED_PARAMETER") context: Context): Palette = BRAND
}

/** Widget bosilganda ilovani `atoyo://<path>` bilan ochadi (`App.tsx` dagi `linking`, `MainActivity`). */
fun widgetOpenIntent(context: Context, path: String): Intent =
    Intent(Intent.ACTION_VIEW, Uri.parse("atoyo://$path")).setPackage(context.packageName)
