import os
import threading
import http.server
import socketserver
import logging
import httpx
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    MessageHandler,
    ContextTypes,
    filters,
)

PORT = int(os.environ.get("PORT", 10000))

class HealthCheckHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ANKA VIP Ultimate SMS Bot is running perfectly!")

def run_web_server():
    with socketserver.TCPServer(("", PORT), HealthCheckHandler) as httpd:
        httpd.serve_forever()

threading.Thread(target=run_web_server, daemon=True).start()

BOT_TOKEN = "8874989367:AAHTmD5Lq_jJxb3KwuJJx31vhzNGt_fQ6YU"
IBAN = "TR62 0006 2000 5000 0006 8107 73"
RECIPIENT = "Resul Sakal"
SUPPORT_USERNAME = "SMSPATRONUM"

# Sizin Telegram ID'niz buraya entegre edildi
ADMIN_USER_ID = 8964930489

SMS_API_KEY = "osms_ff02e69d0bdd0ddf9106b60644059c77df21bb3b5a738a9e"
SMS_API_URL = "https://onaylasms.com.tr/stubs/handler_api.php"

logging.basicConfig(format="%(asctime)s - %(levelname)s - %(message)s", level=logging.INFO)

SERVICES = {
    "ph_wp": {
        "name": "🔥 Filipinler WhatsApp",
        "code": "whatsapp",
        "countries": ["philippines", "indonesia", "vietnam", "malaysia", "russia", "0"],
        "price_tl": 200
    },
    "uk_wp": {
        "name": "🇬🇧 İngiltere WhatsApp",
        "code": "whatsapp",
        "countries": ["uk", "england", "russia", "romania", "0"],
        "price_tl": 150
    },
    "uk_tg": {
        "name": "🇬🇧 İngiltere Telegram",
        "code": "telegram",
        "countries": ["uk", "england", "russia", "kazakhstan", "0"],
        "price_tl": 150
    },
    "tr_tg": {
        "name": "🇹🇷 TR Telegram",
        "code": "telegram",
        "countries": ["turkey", "russia", "kazakhstan", "0"],
        "price_tl": 200
    },
    "tr_wp": {
        "name": "🇹🇷 TR WhatsApp",
        "code": "whatsapp",
        "countries": ["turkey", "russia", "0"],
        "price_tl": 300
    },
    "tr_ig": {
        "name": "📸 TR Instagram",
        "code": "instagram",
        "countries": ["turkey", "russia", "0"],
        "price_tl": 60
    },
    "tr_fb": {
        "name": "📘 TR Facebook",
        "code": "facebook",
        "countries": ["turkey", "russia", "0"],
        "price_tl": 50
    },
    "tr_go": {
        "name": "🌐 TR Google / Gmail",
        "code": "google",
        "countries": ["turkey", "russia", "0"],
        "price_tl": 30
    }
}

def main_menu():
    keyboard = []
    for key, info in SERVICES.items():
        keyboard.append([InlineKeyboardButton(f"{info['name']} — {info['price_tl']} TL", callback_data=f"iban_{key}")])
    keyboard.append([InlineKeyboardButton("📞 Canlı Destek", url=f"https://t.me/{SUPPORT_USERNAME}")])
    return InlineKeyboardMarkup(keyboard)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        text = (
            "💎 *ANKA VIP — PREMIUM SMS ONAY SERVİSİ*\n\n"
            "⚡ Kesintisiz Otomatik Numara Tedariği\n"
            "Aşağıdaki menüden almak istediğiniz güvenli servisi seçebilirsiniz."
        )
        if update.message:
            await update.message.reply_text(text, parse_mode="Markdown", reply_markup=main_menu())
        elif update.callback_query:
            await update.callback_query.message.edit_text(text, parse_mode="Markdown", reply_markup=main_menu())
    except Exception as e:
        logging.error(f"Start komutu hatası: {e}")

async def text_message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        if update.message and update.message.text:
            text = (
                "💎 *ANKA VIP — PREMIUM SMS ONAY SERVİSİ*\n\n"
                "⚡ Lütfen menüden bir servis seçin veya ödeme dekontunuzu doğrudan gönderin."
            )
            await update.message.reply_text(text, parse_mode="Markdown", reply_markup=main_menu())
    except Exception as e:
        logging.error(f"Metin mesajı işleme hatası: {e}")

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        query = update.callback_query
        await query.answer()
        data = query.data

        if data.startswith("iban_"):
            service_key = data.replace("iban_", "")
            service_info = SERVICES.get(service_key, SERVICES["ph_wp"])
            
            context.user_data["selected_service"] = service_key

            text = (
                f"💳 *IBAN İLE ÖDEME EKRANI*\n\n"
                f"📦 Ürün: *{service_info['name']}*\n"
                f"💰 Tutar: *{service_info['price_tl']} TL*\n\n"
                f"IBAN:\n`{IBAN}`\n\n"
                f"Alıcı: *{RECIPIENT}*\n\n"
                "━━━━━━━━━━━━━━━━\n"
                f"1️⃣ Yukarıdaki hesaba tam *{service_info['price_tl']} TL* gönderin.\n"
                "2️⃣ Ödeme yaptıktan sonra banka dekontunun ekran görüntüsünü veya dosyasını **doğrudan bu sohbete gönderin**."
            )
            keyboard = [[InlineKeyboardButton("⬅️ Geri", callback_data="home")]]
            await query.edit_message_text(text, parse_mode="Markdown", reply_markup=InlineKeyboardMarkup(keyboard))

        elif data.startswith("approve_"):
            parts = data.split("_")
            target_user_id = int(parts[1])
            service_key = parts[2]
            service_info = SERVICES.get(service_key, SERVICES["ph_wp"])

            await query.edit_message_text("🔄 Ödeme onaylandı, stok havuzu taranıyor ve numara çekiliyor...")

            number, activation_id, country_used = await fetch_number_with_fallback(service_info["code"], service_info["countries"])

            if number:
                await query.edit_message_text(
                    f"✅ *Ödeme Onaylandı ve Numara Başarıyla Verildi!*\n"
                    f"👤 Kullanıcı ID: `{target_user_id}`\n"
                    f"📱 Numara: `{number}`",
                    parse_mode="Markdown"
                )

                user_text = (
                    f"✅ *Ödemeniz Yönetici Tarafından Onaylandı!*\n\n"
                    f"📦 Ürün: *{service_info['name']}*\n"
                    f"🌍 Ülke: `{country_used.upper()}`\n"
                    f"📱 *Numara:* `{number}`\n"
                    f"🆔 *İşlem ID:* `{activation_id}`"
                )
                try:
                    await context.bot.send_message(chat_id=target_user_id, text=user_text, parse_mode="Markdown")
                except Exception as ex:
                    logging.error(f"Kullanıcıya numara iletilemedi: {ex}")
            else:
                keyboard_retry = [[InlineKeyboardButton("🔄 Tekrar Dene / Stok Yenile", callback_data=f"approve_{target_user_id}_{service_key})]]
                await query.edit_message_text(
                    f"⚠️ Ödeme onaylandı ancak anlık olarak stok bulunamadı (`NO_NUMBERS`). Lütfen tekrar deneyin.",
                    reply_markup=InlineKeyboardMarkup(keyboard_retry),
                    parse_mode="Markdown"
                )

        elif data.startswith("reject_"):
            target_user_id = int(data.split("_")[1])
            await query.edit_message_text("❌ Ödeme reddedildi.")
            try:
                await context.bot.send_message(
                    chat_id=target_user_id,
                    text="❌ *Ödeme Bildiriminiz Reddedildi.*\n\nLütfen geçerli bir dekont gönderdiğinizden emin olun.",
                    parse_mode="Markdown"
                )
            except Exception as ex:
                logging.error(f"Kullanıcıya ret bildirimi gönderilemedi: {ex}")

        elif data.startswith("refresh_num_"):
            service_key = data.replace("refresh_num_", "")
            service_info = SERVICES.get(service_key, SERVICES["ph_wp"])
            
            await query.edit_message_text("🔄 Stok havuzları yeniden taranıyor...")
            
            number, activation_id, country_used = await fetch_number_with_fallback(service_info["code"], service_info["countries"])
            
            if number:
                text = (
                    f"✅ *Yeni Numara Başarıyla Tanımlandı!*\n\n"
                    f"📦 Ürün: *{service_info['name']}*\n"
                    f"🌍 Bölge/Ülke: `{country_used.upper()}`\n"
                    f"📱 *Yeni Numara:* `{number}`\n"
                    f"🆔 *İşlem ID:* `{activation_id}`"
                )
                keyboard = [
                    [InlineKeyboardButton("🔄 Stokları Yenile / Değiştir", callback_data=f"refresh_num_{service_key}")],
                    [InlineKeyboardButton("🏠 Ana Menü", callback_data="home")]
                ]
                await query.edit_message_text(text, parse_mode="Markdown", reply_markup=InlineKeyboardMarkup(keyboard))
            else:
                text = (
                    f"⚠️ *Anlık olarak stok bulunamadı (NO_NUMBERS).* \n\n"
                    f"Lütfen birazdan tekrar 'Tekrar Dene' butonuna basın veya canlı desteğe bildirin."
                )
                keyboard = [
                    [InlineKeyboardButton("🔄 Tekrar Dene", callback_data=f"refresh_num_{service_key}")],
                    [InlineKeyboardButton("📞 Canlı Destek", url=f"https://t.me/{SUPPORT_USERNAME}")],
                    [InlineKeyboardButton("🏠 Ana Menü", callback_data="home")]
                ]
                await query.edit_message_text(text, parse_mode="Markdown", reply_markup=InlineKeyboardMarkup(keyboard))

        elif data == "home":
            text = (
                "💎 *ANKA VIP — PREMIUM SMS ONAY SERVİSİ*\n\n"
                "⚡ Kesintisiz Otomatik Numara Tedariği\n"
                "Aşağıdaki menüden almak istediğiniz güvenli servisi seçebilirsiniz."
            )
            await query.edit_message_text(text, parse_mode="Markdown", reply_markup=main_menu())
    except Exception as e:
        logging.error(f"Buton işleme hatası: {e}")

async def fetch_number_with_fallback(service_code, countries_list):
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    async with httpx.AsyncClient(timeout=10.0, headers=headers, follow_redirects=True) as client:
        for country in countries_list:
            params = {
                "api_key": SMS_API_KEY,
                "action": "getNumber",
                "service": service_code,
                "country": country
            }
            try:
                response = await client.get(SMS_API_URL, params=params)
                res_text = response.text.strip()
                logging.info(f"API İstek [{service_code} - Ülke: {country}] Yanıt: {res_text}")
                
                if "ACCESS_NUMBER" in res_text:
                    parts = res_text.split(":")
                    activation_id = parts[1] if len(parts) > 1 else "Bilinmiyor"
                    phone_number = parts[2] if len(parts) > 2 else res_text
                    return phone_number, activation_id, country
            except Exception as e:
                logging.error(f"API Hatası [{country}]: {e}")
                continue
        return None, None, None

async def receipt_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        if update.message and (update.message.photo or update.message.document):
            user = update.message.from_user
            service_key = context.user_data.get("selected_service", "ph_wp")
            service_info = SERVICES.get(service_key, SERVICES["ph_wp"])

            await update.message.reply_text("📥 *Dekontunuz alındı!* Yönetici onayına gönderildi, lütfen bekleyin.")

            admin_text = (
                f"🔔 *YENİ ÖDEME BİLDİRİMİ!*\n\n"
                f"👤 Kullanıcı: {user.full_name} (@{user.username or 'Yok'}, ID: `{user.id}`)\n"
                f"📦 Seçilen Ürün: *{service_info['name']}* ({service_info['price_tl']} TL)\n\n"
                f"Aşağıdaki butonları kullanarak ödemeyi onaylayabilir veya reddedebilirsiniz:"
            )
            admin_keyboard = [
                [
                    InlineKeyboardButton("✅ Onayla & Numara Ver", callback_data=f"approve_{user.id}_{service_key}"),
                    InlineKeyboardButton("❌ Reddet", callback_data=f"reject_{user.id}")
                ]
            ]

            if update.message.photo:
                photo_file = update.message.photo[-1].file_id
                await context.bot.send_photo(
                    chat_id=ADMIN_USER_ID,
                    photo=photo_file,
                    caption=admin_text,
                    reply_markup=InlineKeyboardMarkup(admin_keyboard),
                    parse_mode="Markdown"
                )
            elif update.message.document:
                doc_file = update.message.document.file_id
                await context.bot.send_document(
                    chat_id=ADMIN_USER_ID,
                    document=doc_file,
                    caption=admin_text,
                    reply_markup=InlineKeyboardMarkup(admin_keyboard),
                    parse_mode="Markdown"
                )
    except Exception as e:
        logging.error(f"Dekont işleme hatası: {e}")

def main():
    app = Application.builder().token(BOT_TOKEN).build()
    
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CallbackQueryHandler(button_handler))
    app.add_handler(MessageHandler(filters.PHOTO | filters.Document.ALL, receipt_handler))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, text_message_handler))
    
    print("ANKA VIP Bot Tam Entegre Edildi ve Çalışıyor!")
    app.run_polling(drop_pending_updates=True)

if __name__ == "__main__":
    main()
