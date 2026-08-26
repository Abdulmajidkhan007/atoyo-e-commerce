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
 * "Xodim uchun: bugungi buyurtmalar" (2x2). FAQAT admin/xodim hisobida
 * ma'lumot bor - rol tekshiruvi RN tomonida (`writeStaffWidget()`,
 * `mobile/src/widgets.ts`): xodim bo'lmasa bu yerga hech narsa yozilmaydi
 * va widget "Ma'lumot yo'q" deydi.
 */
class StaffWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val raw = WidgetPrefs.read(context, WidgetPrefs.KEY_STAFF)
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
                .padding(12.dp)
                .clickable(onClick = actionStartActivity(widgetOpenIntent(context, "xodim-buyurtmalar"))),
            verticalAlignment = Alignment.CenterVertically,
            horizontalAlignment = Alignment.Start,
        ) {
            Text(
                text = "Bugungi buyurtmalar",
                style = TextStyle(color = ColorProvider(palette.muted), fontSize = 11.sp),
            )
            if (data == null) {
                Text(
                    text = "Ma'lumot yo'q",
                    style = TextStyle(
                        color = ColorProvider(palette.text),
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                    ),
                )
            } else {
                Text(
                    text = "${data.optInt("count")} ta buyurtma",
                    style = TextStyle(
                        color = ColorProvider(palette.text),
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                    ),
                )
                Text(
                    text = data.optString("total"),
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

class StaffWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = StaffWidget()
}
