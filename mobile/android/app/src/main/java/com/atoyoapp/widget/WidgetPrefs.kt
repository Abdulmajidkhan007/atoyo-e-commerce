package com.atoyoapp.widget

import android.content.Context

/**
 * RN tomoni tayyorlagan JSON "surat" shu yerga yoziladi. Widget bu
 * faylni FAQAT O'QIYDI - tarmoqqa hech qachon o'zi chiqmaydi.
 */
object WidgetPrefs {
    private const val FILE = "atoyo_widgets"
    const val KEY_ORDER = "order"
    const val KEY_CART = "cart"
    const val KEY_STAFF = "staff"

    fun write(context: Context, key: String, json: String?) {
        val prefs = context.getSharedPreferences(FILE, Context.MODE_PRIVATE)
        if (json == null) prefs.edit().remove(key).apply() else prefs.edit().putString(key, json).apply()
    }

    fun read(context: Context, key: String): String? =
        context.getSharedPreferences(FILE, Context.MODE_PRIVATE).getString(key, null)
}
