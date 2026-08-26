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
 * "Mening buyurtmam" (2x2). Ma'lumot `writeOrderWidget()` (mobile/src/widgets.ts)
 * yozadi: oxirgi buyurtma raqami, holati va summasi. Buyurtma yo'q bo'lsa
 * katalogga havola ko'rsatiladi.
 */
class OrderWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val raw = WidgetPrefs.read(context, WidgetPrefs.KEY_ORDER)
        val palette = WidgetColors.forContext(context)
        val appContext = context
        provideContent {
            Content(appContext, raw, palette)
        }
    }

    @Composable
    private fun Content(context: Context, raw: String?, palette: WidgetColors.Palette) {
        val data = raw?.let { runCatching { JSONObject(it) }.getOrNull() }
        val path = if (data == null) "katalog" else "buyurtmalar"

        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(palette.bg))
                .padding(12.dp)
                .clickable(onClick = actionStartActivity(widgetOpenIntent(context, path))),
            verticalAlignment = Alignment.CenterVertically,
            horizontalAlignment = Alignment.Start,
        ) {
            Text(
                text = "Mening buyurtmam",
                style = TextStyle(color = ColorProvider(palette.muted), fontSize = 11.sp),
            )
            if (data == null) {
                Text(
                    text = "Buyurtma yo'q",
                    style = TextStyle(
                        color = ColorProvider(palette.text),
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                    ),
                )
                Text(
                    text = "Katalogni ko'rish",
                    style = TextStyle(color = ColorProvider(palette.accent), fontSize = 12.sp),
                )
            } else {
                Text(
                    text = "${data.optString("statusEmoji")} #${data.optString("shortId")}",
                    style = TextStyle(
                        color = ColorProvider(palette.text),
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                    ),
                )
                Text(
                    text = data.optString("statusLabel"),
                    style = TextStyle(color = ColorProvider(palette.muted), fontSize = 12.sp),
                )
                Text(
                    text = data.optString("totalAmount"),
                    style = TextStyle(
                        color = ColorProvider(palette.accent),
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                    ),
                )
            }
        }
    }
}

class OrderWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = OrderWidget()
}
