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
    const data = query.data; // مثال: approve_123456789_5
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;

    if (data.startsWith('approve_')) {
        // الصيغة: approve_userId_amount
        const parts = data.split('_');
        const userId = parts[1]; // رقم الـ ID أو رقم الحساب
        const amountToAdd = parseFloat(parts[2]);

        if (!userId || isNaN(amountToAdd)) {
            return await bot.answerCallbackQuery(query.id, { text: "❌ خطأ في بيانات الزر", show_alert: true });
        }

        try {
            // 1. جلب الرصيد باستخدام الـ ID أو الرقم
            const getRes = await axios.get(`${FIREBASE_DB_URL}/users/${userId}/balance.json`);
            let currentBalance = parseFloat(getRes.data) || 0;
            let newBalance = currentBalance + amountToAdd;

            // 2. تحديث الرصيد الجديد في Firebase
            await axios.put(`${FIREBASE_DB_URL}/users/${userId}/balance.json`, newBalance);

            // 3. تأكيد الإضافة للأدمن
            await bot.answerCallbackQuery(query.id, { text: `✅ تم إضافة ${amountToAdd} USDT` });
            await bot.editMessageText(
                `✅ **تمت الموافقة وإضافة الرصيد بنجاح!**\n\n🆔 **رقم المستخدم:** \`${userId}\`\n💰 **المبلغ المضاف:** ${amountToAdd} USDT\n📈 **الرصيد الجديد:** ${newBalance} USDT`,
                { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' }
            );

            // 4. إرسال إشعار للمستخدم نفسه بإن رصيده تم شحنه (اختياري)
            try {
                await bot.sendMessage(userId, `🎉 **تم شحن حسابك بنجاح!**\n💰 **المبلغ المضاف:** ${amountToAdd} USDT\n📈 **رصيدك الحالي:** ${newBalance} USDT`, { parse_mode: 'Markdown' });
            } catch (e) {
                console.log("لم يتم إرسال إشعار للمستخدم المباشر");
            }

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
