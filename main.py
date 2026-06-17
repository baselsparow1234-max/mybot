import telebot
from telebot import types
from flask import Flask
from threading import Thread

# توكن البوت
bot = telebot.TeleBot("8842367714:AAFZvEnUoZ54YMDcsv7XyAX1HAC6MGgFAYI")

# --- كود الـ Flask لضمان بقاء البوت شغالاً ---
app = Flask('')

@app.route('/')
def home():
    return "البوت يعمل بكامل طاقته!"

def run_server():
    app.run(host='0.0.0.0', port=8080)

def keep_alive():
    t = Thread(target=run_server)
    t.start()
# ---------------------------------------------

@bot.callback_query_handler(func=lambda call: True)
def callback_query(call):
    try:
        user_id = call.data.split('_')[1]
        
        if call.data.startswith("confirm"):
            bot.send_message(user_id, "تم قبول طلبك بنجاح! 🎉\nللبدء في إنشاء وتفعيل بوتك الخاص فوراً، يرجى الانتقال إلى بوت الدعم من هنا: @LivegramBot")
            bot.answer_callback_query(call.id, "✅ تم إرسال رابط البوت للاعب بنجاح!")
            
        elif call.data.startswith("reject"):
            bot.send_message(user_id, "عذراً يا غالي، لم يتم تأكيد طلبك.\nالرجاء التأكد من رقم عملية الشحن أو الكود المرسل إلينا والمحاولة مرة أخرى.")
            bot.answer_callback_query(call.id, "❌ تم إرسال التنبيه بالخطأ للاعب!")
            
    except Exception as e:
        bot.answer_callback_query(call.id, "حدث خطأ أثناء معالجة الطلب.")

# تشغيل نظام الاستيقاظ
keep_alive()

print("🚀 البوت الآن يعمل بنجاح ومستعد لاستقبال الأوامر...")
bot.polling(none_stop=True)
