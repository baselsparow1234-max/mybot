const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = process.env.TELEGRAM_BOT_TOKEN;
const FIREBASE_DB_URL = 'https://chekinroad-afa14-default-rtdb.firebaseio.com';

// إنشاء تطبيق Express ليعمل كـ Server
const app = express();
app.use(express.json());

// إعداد البوت بدون Polling ليعمل بأسلوب Webhook السريع
const bot = new TelegramBot(token);

// مسار رئيسي للتأكد من أن الخادم يعمل
app.get('/', (req, res) => {
    res.send('Telegram Bot Webhook is Running!');
});

// استقبال تحديثات الضغط من التليجرام عبر الـ Webhook
app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// معالجة الضغط على أزرار "موافقة" أو "رفض"
bot.on('callback_query', async (query) => {
    const data = query.data; // مثال: approve_dtt_30
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;

    if (data.startsWith('approve_')) {
        const parts = data.split('_');
        const username = parts[1];
        const amountToAdd = parseFloat(parts[2]);

        try {
            // 1. جلب الرصيد الحالي للمستخدم من الفايربيس
            const getRes = await axios.get(`${FIREBASE_DB_URL}/users/${username}/balance.json`);
            let currentBalance = parseFloat(getRes.data) || 0;
            let newBalance = currentBalance + amountToAdd;

            // 2. تحديث الرصيد الجديد في الفايربيس
            await axios.put(`${FIREBASE_DB_URL}/users/${username}/balance.json`, newBalance);

            // 3. إشعار في التليجرام وتحديث نص الرسالة
            bot.answerCallbackQuery(query.id, { text: `✅ تم إضافة ${amountToAdd} USDT بنجاح!` });
            bot.editMessageText(
                `✅ **تمت الموافقة وإضافة الرصيد بنجاح!**\n\n` +
                `👤 **المستخدم:** ${username}\n` +
                `💰 **المبلغ المضاف:** ${amountToAdd} USDT\n` +
                `📈 **الرصيد الجديد:** ${newBalance} USDT`, 
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown'
                }
            );

        } catch (error) {
            console.error('خطأ في التحديث:', error);
            bot.answerCallbackQuery(query.id, { text: "❌ حدث خطأ أثناء تحديث الرصيد." });
        }
    } else if (data.startsWith('reject_')) {
        bot.answerCallbackQuery(query.id, { text: "تم رفض الطلب." });
        bot.editMessageText(`❌ **تم رفض طلب الإيداع**`, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown'
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
