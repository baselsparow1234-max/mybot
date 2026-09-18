const TELEGRAM_BOT_TOKEN = "8811735698:AAEIYziXQiaFE7Qxv5oxSywaCbzp8mi-IzA";
const TELEGRAM_CHAT_ID = "8298812929";

async function submitWithdrawal() {
    console.log("submitWithdrawal: بدأت الدالة");

    const userInput = document.getElementById('usernameInput');
    const networkInput = document.getElementById('withdrawNetwork');
    const addressInput = document.getElementById('walletAddress');
    const amountInput = document.getElementById('withdrawAmount');
    const submitBtn = document.querySelector('.submit-btn');

    const user = userInput ? userInput.value.trim() : "";
    const network = networkInput ? networkInput.value : "";
    const address = addressInput ? addressInput.value.trim() : "";
    const amount = amountInput ? amountInput.value.trim() : "";

    if (!user) {
        alert("⚠️ يرجى أدخل اسم الحساب.");
        return;
    }
    if (!address) {
        alert("⚠️ يرجى إدخال عنوان المحفظة.");
        return;
    }
    if (!amount || parseFloat(amount) <= 0) {
        alert("⚠️ يرجى أدخل مبلغ سحب صحيح.");
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "جارٍ الإرسال...";
    }

    // تنظيف اسم المستخدم بنفس طريقة كود الإيداع، حتى يطابق الـ callback_data
    const cleanUser = user.replace(/[^a-zA-Z0-9]/g, "_");

    const messageText = `📤 **طلب سحب يدوي جديد**\n\n` +
                        `👤 **المستخدم:** ${user}\n` +
                        `🌐 **الشبكة:** ${network}\n` +
                        `💰 **المبلغ المطلوب:** ${amount} USDT\n` +
                        `🏦 **عنوان المحفظة:**\n\`${address}\``;

    // أزرار الموافقة والرفض - تطابق شرط index.js: wapprove / wreject
    const replyMarkup = {
        inline_keyboard: [
            [
                { text: "✅ موافقة وخصم الرصيد", callback_data: `wapprove:${cleanUser}:${amount}` },
                { text: "❌ رفض الطلب", callback_data: `wreject:${cleanUser}` }
            ]
        ]
    };

    console.log("submitWithdrawal: عم أبعت الطلب لتليجرام...", { user, network, amount, address });

    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: messageText,
                parse_mode: "Markdown",
                reply_markup: replyMarkup
            })
        });

        const data = await response.json();
        console.log("submitWithdrawal: رد تليجرام:", data);

        if (data.ok) {
            alert("✅ تم إرسال طلب السحب بنجاح! سيتم مراجعة الطلب وتحويل المبلغ.");
            addressInput.value = "";
            amountInput.value = "";
        } else {
            console.error("submitWithdrawal: تليجرام رفض الطلب:", data.description);
            alert("❌ حدث خطأ أثناء الإرسال: " + data.description);
        }
    } catch (error) {
        console.error("submitWithdrawal: خطأ بالاتصال:", error);
        alert("❌ تعذر الاتصال بالسيرفر: " + error.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = "إرسال طلب السحب";
        }
    }
}
