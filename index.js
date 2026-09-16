const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// التوكن ورابط الفايربيس
const token = "8811735698:AAEIYziXQiaFE7Qxv5oxSywaCbzp8mi-IzA";
const FIREBASE_DB_URL = 'https://chekinroad-afa14-default-rtdb.firebaseio.com';

const app = express();
app.use(express.json());

const bot = new TelegramBot(token);

// مسار للتأكد أن السيرفر يعمل
app.get('/', (req, res) => res.send('Server is Running!'));

// استقبال الإشارات من التليجرام
app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// عند الضغط على زر موافقة أو رفض في التليجرام
bot.on('callback_query', async (query) => {
    const data = query.data; // مثال: approve_dtt_30
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;

    if (data.startsWith('approve_')) {
        const parts = data.split('_');
        const username = parts[1];
        const amountToAdd = parseFloat(parts[2]);

        try {
            // 1. جلب الرصيد الحالي من الفايربيس
            const getRes = await axios.get(`${FIREBASE_DB_URL}/users/${username}/balance.json`);
            let currentBalance = parseFloat(getRes.data) || 0;
            let newBalance = currentBalance + amountToAdd;

            // 2. تحديث الرصيد الجديد في الفايربيس
            await axios.put(`${FIREBASE_DB_URL}/users/${username}/balance.json`, newBalance);

            // 3. تعديل رسالة التليجرام لتأكيد الإضافة
            bot.answerCallbackQuery(query.id, { text: `✅ تم إضافة ${amountToAdd} USDT` });
            bot.editMessageText(
                `✅ **تمت الموافقة وإضافة الرصيد بنجاح!**\n\n👤 **المستخدم:** ${username}\n💰 **المبلغ المضاف:** ${amountToAdd} USDT\n📈 **الرصيد الجديد:** ${newBalance} USDT`,
                { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' }
            );
        } catch (error) {
            bot.answerCallbackQuery(query.id, { text: "❌ حدث خطأ في التحديث" });
        }
    } else if (data.startsWith('reject_')) {
        bot.answerCallbackQuery(query.id, { text: "تم الرفض" });
        bot.editMessageText(`❌ **تم رفض طلب الإيداع**`, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
