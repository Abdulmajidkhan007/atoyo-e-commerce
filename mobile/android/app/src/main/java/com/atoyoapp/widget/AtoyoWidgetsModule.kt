package com.atoyoapp.widget

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
// `updateAll` - androidx.glance.appwidget dagi KENGAYTMA funksiya:
// importsiz "Unresolved reference" bo'ladi (CI shundan yiqilgan edi).
import androidx.glance.appwidget.updateAll
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * RN tomoni (`mobile/src/widgets.ts`) buyurtma/savat/xodim "surati"ni
 * shu modul orqali yozadi. Bu yerda TARMOQQA chiqilmaydi - faqat
 * SharedPreferences'ga yozib, Glance widget'ni qayta chizishni
 * so'raymiz (`GlanceAppWidget.updateAll`).
 */
class AtoyoWidgetsModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AtoyoWidgets"

    @ReactMethod
    fun writeOrderWidget(json: String?) {
        WidgetPrefs.write(reactContext, WidgetPrefs.KEY_ORDER, json)
        refresh { OrderWidget().updateAll(reactContext) }
    }

    @ReactMethod
    fun writeCartWidget(json: String?) {
        WidgetPrefs.write(reactContext, WidgetPrefs.KEY_CART, json)
        refresh { CartWidget().updateAll(reactContext) }
    }

    @ReactMethod
    fun writeStaffWidget(json: String?) {
        WidgetPrefs.write(reactContext, WidgetPrefs.KEY_STAFF, json)
        refresh { StaffWidget().updateAll(reactContext) }
    }

    private fun refresh(block: suspend () -> Unit) {
        CoroutineScope(Dispatchers.IO).launch { block() }
    }
}
