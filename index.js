const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = process.env.TELEGRAM_BOT_TOKEN || "8811735698:AAEIYziXQiaFE7Qxv5oxSywaCbzp8mi-IzA";
const FIREBASE_DB_URL = 'https://chekinroad-afa14-default-rtdb.firebaseio.com';

const app = express();
app.use(express.json());

const bot = new TelegramBot(token);

app.get('/', (req, res) => res.send('Server is Running!'));

app.post(`/bot${token}`, async (req, res) => {
    try {
        await bot.processUpdate(req.body);
    } catch (err) {
        console.error("Update processing error:", err);
    }
    res.sendStatus(200);
});

bot.on('callback_query', async (query) => {
    const data = query.data; 
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;

    if (data.startsWith('approve_')) {
        // مفترض تكون الصيغة: approve_username_amount
        const parts = data.split('_');
        const username = parts[1];
        const amountToAdd = parseFloat(parts[2]);

        // للتحقق من سلامة البيانات المرسلة من الزر
        if (!username || isNaN(amountToAdd)) {
            return await bot.answerCallbackQuery(query.id, { text: "❌ خطأ في صيغة البيانات المرفقة بالزر", show_alert: true });
        }

        try {
            // 1. جلب الرصيد الحالي
            const getRes = await axios.get(`${FIREBASE_DB_URL}/users/${username}/balance.json`);
            let currentBalance = parseFloat(getRes.data) || 0;
            let newBalance = currentBalance + amountToAdd;

            // 2. تحديث الرصيد الجديد
            await axios.put(`${FIREBASE_DB_URL}/users/${username}/balance.json`, newBalance);

            // 3. الرد والتأكيد
            await bot.answerCallbackQuery(query.id, { text: `✅ تم إضافة ${amountToAdd} USDT` });
            await bot.editMessageText(
                `✅ **تمت الموافقة وإضافة الرصيد بنجاح!**\n\n👤 **المستخدم:** ${username}\n💰 **المبلغ المضاف:** ${amountToAdd} USDT\n📈 **الرصيد الجديد:** ${newBalance} USDT`,
                { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error("Firebase Error:", error.response ? error.response.data : error.message);
            await bot.answerCallbackQuery(query.id, { text: "❌ فشلت عملية التحديث في الفايربيس", show_alert: true });
        }
    } else if (data.startsWith('reject_')) {
        await bot.answerCallbackQuery(query.id, { text: "تم الرفض" });
        await bot.editMessageText(`❌ **تم رفض طلب الإيداع**`, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
