const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = process.env.TELEGRAM_BOT_TOKEN || "8811735698:AAEIYziXQiaFE7Qxv5oxSywaCbzp8mi-IzA";
const FIREBASE_DB_URL = 'https://chekinroad-afa14-default-rtdb.firebaseio.com';

const app = express();
app.use(express.json());

const bot = new TelegramBot(token, { polling: false });

app.get('/', (req, res) => res.send('Server is Running!'));

// معالجة تحديثات الويب هوك بشكل متزامن
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
        const parts = data.split('_');
        const userKey = parts[1] ? parts[1].trim() : null;
        const amountToAdd = parseFloat(parts[2]);

        if (!userKey || isNaN(amountToAdd)) {
            return await bot.answerCallbackQuery(query.id, { text: "❌ خطأ في صيغة بيانات الزر", show_alert: true });
        }

        try {
            const cleanDbUrl = FIREBASE_DB_URL.replace(/\/+$/, '');

            // 1. محاولة جلب الرصيد من مسار الجذر أولاً ثم من مسار users
            let targetPath = `${cleanDbUrl}/${userKey}/balance.json`;
            let getRes = await axios.get(targetPath);

            if (getRes.data === null) {
                targetPath = `${cleanDbUrl}/users/${userKey}/balance.json`;
                getRes = await axios.get(targetPath);
            }

            let currentBalance = parseFloat(getRes.data) || 0;
            let newBalance = currentBalance + amountToAdd;

            // 2. تحديث الرصيد بصيغة JSON مقبولة
            await axios.put(targetPath, JSON.stringify(newBalance), {
                headers: { 'Content-Type': 'application/json' }
            });

            // 3. التأكيد والتحديث في التليجرام
            await bot.answerCallbackQuery(query.id, { text: `✅ تم إضافة ${amountToAdd} USDT` });
            await bot.editMessageText(
                `✅ **تمت الموافقة وإضافة الرصيد بنجاح!**\n\n👤 **المستخدم:** ${userKey}\n💰 **المبلغ المضاف:** ${amountToAdd} USDT\n📈 **الرصيد الجديد:** ${newBalance} USDT`,
                { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error("Firebase Error Details:", error.response ? error.response.data : error.message);
            await bot.answerCallbackQuery(query.id, { text: "❌ فشلت عملية التحديث في الفايربيس", show_alert: true });
        }
    } else if (data.startsWith('reject_')) {
        await bot.answerCallbackQuery(query.id, { text: "تم الرفض" });
        await bot.editMessageText(`❌ **تم رفض طلب الإيداع**`, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
