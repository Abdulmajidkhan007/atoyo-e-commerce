package com.atoyoapp.widget

import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.net.Uri
import androidx.compose.ui.graphics.Color

/**
 * `mobile/src/theme.tsx` dagi Deep Navy / Aqua-Gold palitrasi bilan bir
 * xil qiymatlar - widget ham tungi/kunduzgi rejimga mos bo'lishi uchun.
 */
object WidgetColors {
    data class Palette(
        val bg: Color,
        val surface: Color,
        val text: Color,
        val muted: Color,
        val accent: Color,
    )

    private val LIGHT = Palette(
        bg = Color(0xFFFFFFFF),
        surface = Color(0xFFEDF4F8),
        text = Color(0xFF072D40),
        muted = Color(0xFF5E8CA6),
        accent = Color(0xFFC49A6C),
    )

    private val DARK = Palette(
        bg = Color(0xFF04202F),
        surface = Color(0xFF0B3B54),
        text = Color(0xFFFFFFFF),
        muted = Color(0xFFC9DCE6),
        accent = Color(0xFFDCC09A),
    )

    fun forContext(context: Context): Palette {
        val isDark = (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
            Configuration.UI_MODE_NIGHT_YES
        return if (isDark) DARK else LIGHT
    }
}

/** Widget bosilganda ilovani `atoyo://<path>` bilan ochadi (`App.tsx` dagi `linking`, `MainActivity`). */
fun widgetOpenIntent(context: Context, path: String): Intent =
    Intent(Intent.ACTION_VIEW, Uri.parse("atoyo://$path")).setPackage(context.packageName)
