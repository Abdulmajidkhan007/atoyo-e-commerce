package com.atoyoapp.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
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
 * "Mening buyurtmam". Ma'lumot `writeOrderWidget()` (mobile/src/widgets.ts)
 * yozadi: oxirgi buyurtma raqami, holati va summasi.
 *
 * O'LCHAMGA MOSLASHADI (`SizeMode.Exact`): widget past bo'lsa (1 katak)
 * faqat bitta qator ko'rsatiladi, aks holda uch qator. Matn hech qachon
 * ikkinchi qatorga o'tmaydi (`maxLines = 1`) - kesilgani ma'qul,
 * chunki widgetda joy qat'iy.
 */
class OrderWidget : GlanceAppWidget() {
    override val sizeMode = SizeMode.Exact

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
        val compact = LocalSize.current.height < 90.dp

        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(palette.bg))
                .padding(horizontal = 12.dp, vertical = if (compact) 6.dp else 10.dp)
                .clickable(onClick = actionStartActivity(widgetOpenIntent(context, path))),
            verticalAlignment = Alignment.CenterVertically,
            horizontalAlignment = Alignment.Start,
        ) {
            if (!compact) {
                Text(
                    text = "Mening buyurtmam",
                    style = TextStyle(color = ColorProvider(palette.muted), fontSize = 11.sp),
                    maxLines = 1,
                )
            }

            if (data == null) {
                Text(
                    text = "Buyurtma yo'q",
                    style = TextStyle(
                        color = ColorProvider(palette.text),
                        fontWeight = FontWeight.Bold,
                        fontSize = if (compact) 14.sp else 16.sp,
                    ),
                    maxLines = 1,
                )
                if (!compact) {
                    Text(
                        text = "Katalogni ko'rish",
                        style = TextStyle(color = ColorProvider(palette.accent), fontSize = 12.sp),
                        maxLines = 1,
                    )
                }
            } else {
                Text(
                    text = "${data.optString("statusEmoji")} #${data.optString("shortId")}",
                    style = TextStyle(
                        color = ColorProvider(palette.text),
                        fontWeight = FontWeight.Bold,
                        fontSize = if (compact) 14.sp else 17.sp,
                    ),
                    maxLines = 1,
                )
                if (!compact) {
                    Text(
                        text = data.optString("statusLabel"),
                        style = TextStyle(color = ColorProvider(palette.muted), fontSize = 12.sp),
                        maxLines = 1,
                    )
                }
                Text(
                    text = data.optString("totalAmount"),
                    style = TextStyle(
                        color = ColorProvider(palette.accent),
                        fontWeight = FontWeight.Bold,
                        fontSize = if (compact) 12.sp else 15.sp,
                    ),
                    maxLines = 1,
                )
            }
        }
    }
}

class OrderWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = OrderWidget()
}
