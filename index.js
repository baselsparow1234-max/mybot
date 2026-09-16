  
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
        const update = req.body;
        if (update && update.callback_query) {
            await handleCallbackQuery(update.callback_query);
        } else {
            await bot.processUpdate(update);
        }
    } catch (err) {
        console.error("Webhook Error:", err);
    }
    res.sendStatus(200);
});

async function handleCallbackQuery(query) {
    const data = query.data;
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;

    // --- معالجة الإيداع (الكود الخاص بك بدون أي تعديل) ---
    if (data.startsWith('approve:')) {
        const parts = data.split(':');
        const cleanUser = parts[1];
        const amountToAdd = parseFloat(parts[2]);

        if (!cleanUser || isNaN(amountToAdd)) {
            return await bot.answerCallbackQuery(query.id, { text: "❌ خطأ في بيانات الزر", show_alert: true });
        }

        try {
            const cleanDbUrl = FIREBASE_DB_URL.replace(/\/+$/, '');
            const targetUrl = `${cleanDbUrl}/users/${cleanUser}.json`;

            const getRes = await axios.get(targetUrl);
            const userData = getRes.data;

            let currentBalance = 0;
            if (userData && userData.balance !== undefined) {
                currentBalance = parseFloat(userData.balance) || 0;
            }

            let newBalance = currentBalance + amountToAdd;

            const balanceUrl = `${cleanDbUrl}/users/${cleanUser}/balance.json`;
            await axios.put(balanceUrl, JSON.stringify(newBalance), {
                headers: { 'Content-Type': 'application/json' }
            });

            await bot.answerCallbackQuery(query.id, { text: `✅ تم إضافة ${amountToAdd} USDT` });
            await bot.editMessageText(
                `✅ **تمت الموافقة وإضافة الرصيد بنجاح!**\n\n👤 **المستخدم:** ${cleanUser}\n💰 **المبلغ المضاف:** ${amountToAdd} USDT\n📈 **الرصيد الجديد:** ${newBalance} USDT`,
                { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error("Firebase Error:", error.message);
            await bot.answerCallbackQuery(query.id, { text: "❌ فشل التحديث في الفايربيس", show_alert: true });
        }
    } else if (data.startsWith('reject:')) {
        await bot.answerCallbackQuery(query.id, { text: "تم الرفض" });
        await bot.editMessageText(`❌ **تم رفض طلب الإيداع**`, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' });
    }

    // --- معالجة طلبات السحب (الجديد والمطابق للإيداع) ---
    else if (data.startsWith('wapprove:')) {
        const parts = data.split(':');
        const cleanUser = parts[1];
        const amountToDeduct = parseFloat(parts[2]);

        if (!cleanUser || isNaN(amountToDeduct)) {
            return await bot.answerCallbackQuery(query.id, { text: "❌ خطأ في بيانات الزر", show_alert: true });
        }

        try {
            const cleanDbUrl = FIREBASE_DB_URL.replace(/\/+$/, '');
            const targetUrl = `${cleanDbUrl}/users/${cleanUser}.json`;

            const getRes = await axios.get(targetUrl);
            const userData = getRes.data;

            let currentBalance = 0;
            if (userData && userData.balance !== undefined) {
                currentBalance = parseFloat(userData.balance) || 0;
            }

            if (currentBalance < amountToDeduct) {
                return await bot.answerCallbackQuery(query.id, { text: "❌ رصيد المستخدم غير كافٍ للخصم!", show_alert: true });
            }

            let newBalance = currentBalance - amountToDeduct;

            const balanceUrl = `${cleanDbUrl}/users/${cleanUser}/balance.json`;
            await axios.put(balanceUrl, JSON.stringify(newBalance), {
                headers: { 'Content-Type': 'application/json' }
            });

            await bot.answerCallbackQuery(query.id, { text: `✅ تم خصم ${amountToDeduct} USDT` });
            await bot.editMessageText(
                `✅ **تمت الموافقة وخصم الرصيد بنجاح!**\n\n👤 **المستخدم:** ${cleanUser}\n💰 **المبلغ المخصوم:** ${amountToDeduct} USDT\n📈 **الرصيد المتبقي:** ${newBalance} USDT`,
                { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error("Firebase Error:", error.message);
            await bot.answerCallbackQuery(query.id, { text: "❌ فشل التحديث في الفايربيس", show_alert: true });
        }
    } else if (data.startsWith('wreject:')) {
        await bot.answerCallbackQuery(query.id, { text: "تم الرفض" });
        await bot.editMessageText(`❌ **تم رفض طلب السحب**`, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' });
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
