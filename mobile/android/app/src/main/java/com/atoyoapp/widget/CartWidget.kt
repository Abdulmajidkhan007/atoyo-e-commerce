package com.atoyoapp.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import org.json.JSONObject

/**
 * "Savat" (2x1). Ma'lumot `writeCartWidget()` (mobile/src/widgets.ts)
 * yozadi: mahsulot soni va umumiy summa. Har doim to'liq lokal (Redux) -
 * savat o'zgarganda darhol yangilanadi.
 */
class CartWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val raw = WidgetPrefs.read(context, WidgetPrefs.KEY_CART)
        val palette = WidgetColors.forContext(context)
        val appContext = context
        provideContent {
            Content(appContext, raw, palette)
        }
    }

    @Composable
    private fun Content(context: Context, raw: String?, palette: WidgetColors.Palette) {
        val data = raw?.let { runCatching { JSONObject(it) }.getOrNull() }

        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(palette.bg))
                .padding(horizontal = 12.dp, vertical = 6.dp)
                .clickable(onClick = actionStartActivity(widgetOpenIntent(context, "savat"))),
            verticalAlignment = Alignment.CenterVertically,
            horizontalAlignment = Alignment.Start,
        ) {
            if (data == null) {
                Text(
                    text = "Savat bo'sh",
                    style = TextStyle(
                        color = ColorProvider(palette.text),
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                    ),
                )
            } else {
                Text(
                    text = "Savat: ${data.optInt("count")} ta",
                    style = TextStyle(color = ColorProvider(palette.muted), fontSize = 11.sp),
                )
                Text(
                    text = data.optString("total"),
                    style = TextStyle(
                        color = ColorProvider(palette.text),
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                    ),
                )
            }
        }
    }
}

class CartWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = CartWidget()
}
