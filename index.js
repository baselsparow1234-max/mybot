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
        const parts = data.split('_');
        
        // استخراج الاسم والمبلغ
        const rawUser = parts[1] ? parts[1].trim() : null;
        const amountToAdd = parseFloat(parts[2]);

        if (!rawUser || isNaN(amountToAdd)) {
            return await bot.answerCallbackQuery(query.id, { text: "❌ خطأ في بيانات الزر", show_alert: true });
        }

        // نفس دالة تنظيف المفتاح المستخدمة في app.js الخاص بالموقع تماماً
        const cleanKey = rawUser.replace(/[^a-zA-Z0-9]/g, "_");

        try {
            const cleanDbUrl = FIREBASE_DB_URL.replace(/\/+$/, '');
            // المسار المطابق للموقع: users/cleanKey.json
            const targetUrl = `${cleanDbUrl}/users/${cleanKey}.json`;

            // 1. جلب بيانات المستخدم الحالية
            const getRes = await axios.get(targetUrl);
            const userData = getRes.data;

            if (!userData) {
                return await bot.answerCallbackQuery(query.id, { 
                    text: `❌ لم يتم العثور على المستخدم (${cleanKey}) في القاعدة!`, 
                    show_alert: true 
                });
            }

            // 2. حساب الرصيد الجديد
            let currentBalance = parseFloat(userData.balance) || 0;
            let newBalance = currentBalance + amountToAdd;

            // 3. تحديث حقل الرصيد فقط داخل نفس الكائن بدون مسح باقي البيانات (كلمة السر، الإيميل، إلخ)
            const balanceUrl = `${cleanDbUrl}/users/${cleanKey}/balance.json`;
            await axios.put(balanceUrl, JSON.stringify(newBalance), {
                headers: { 'Content-Type': 'application/json' }
            });

            // 4. إشعار نجاح العملية والتعديل في تليجرام
            await bot.answerCallbackQuery(query.id, { text: `✅ تم إضافة ${amountToAdd} USDT` });
            await bot.editMessageText(
                `✅ **تمت الموافقة وإضافة الرصيد بنجاح!**\n\n👤 **المستخدم:** ${rawUser}\n🔑 **المفتاح في القاعدة:** ${cleanKey}\n💰 **المبلغ المضاف:** ${amountToAdd} USDT\n📈 **الرصيد الجديد:** ${newBalance} USDT`,
                { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error("Firebase Update Error:", error.response ? error.response.data : error.message);
            await bot.answerCallbackQuery(query.id, { text: "❌ حدث خطأ أثناء التحديث في الفايربيس", show_alert: true });
        }
    } else if (data.startsWith('reject_')) {
        await bot.answerCallbackQuery(query.id, { text: "تم الرفض" });
        await bot.editMessageText(`❌ **تم رفض طلب الإيداع**`, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
