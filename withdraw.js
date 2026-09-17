const TELEGRAM_BOT_TOKEN = "8811735698:AAEIYziXQiaFE7Qxv5oxSywaCbzp8mi-IzA";
const TELEGRAM_CHAT_ID = "8298812929";

async function submitWithdrawal() {
    const userInput = document.getElementById('usernameInput');
    const networkInput = document.getElementById('withdrawNetwork');
    const addressInput = document.getElementById('walletAddress');
    const amountInput = document.getElementById('withdrawAmount');

    const user = userInput ? userInput.value.trim() : "";
    const network = networkInput ? networkInput.value : "";
    const address = addressInput ? addressInput.value.trim() : "";
    const amount = amountInput ? amountInput.value.trim() : "";

    // التأكد من إدخال البيانات الأساسية
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

    // نص الرسالة الصريح المباشر للتليجرام
    const messageText = `📤 **طلب سحب يدوي جديد**\n\n` +
                        `👤 **المستخدم:** ${user}\n` +
                        `🌐 **الشبكة:** ${network}\n` +
                        `💰 **المبلغ المطلوب:** ${amount} USDT\n` +
                        `🏦 **عنوان المحفظة:**\n\`${address}\``;

    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: messageText,
                parse_mode: "Markdown"
            })
        });

        const data = await response.json();

        if (data.ok) {
            alert("✅ تم إرسال طلب السحب بنجاح! سيتم مراجعة الطلب وتحويل المبلغ.");
            // تفريغ المربعات بعد الإرسال
            addressInput.value = "";
            amountInput.value = "";
        } else {
            alert("❌ حدث خطأ أثناء الإرسال: " + data.description);
        }
    } catch (error) {
        alert("❌ تعذر الاتصال بالسيرفر: " + error.message);
    }
}
