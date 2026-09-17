const TELEGRAM_BOT_TOKEN = "8811735698:AAEIYziXQiaFE7Qxv5oxSywaCbzp8mi-IzA";
const TELEGRAM_CHAT_ID = "8298812929";

// 1. دالة جلب الرصيد الحقيقي للمستخدم من Firebase عبر Vercel
async function loadUserBalance() {
    const userInput = document.getElementById('usernameInput');
    const balanceSpan = document.getElementById('userCurrentBalance');
    const user = userInput ? userInput.value.trim() : "";

    if (!user) {
        alert("⚠️ يرجى إدخال اسم الحساب أولاً.");
        return;
    }

    balanceSpan.innerText = "جاري التحميل...";

    try {
        const res = await fetch(`https://mybot-six-lilac.vercel.app/api/balance?user=${encodeURIComponent(user)}`);
        const data = await res.json();
        
        if (data && data.balance !== undefined) {
            balanceSpan.innerText = data.balance;
        } else {
            balanceSpan.innerText = "0";
        }
    } catch (err) {
        console.error(err);
        balanceSpan.innerText = "0";
    }
}

// 2. دالة إرسال طلب السحب للتليجرام
async function submitWithdrawal() {
    const userInput = document.getElementById('usernameInput');
    const addressInput = document.getElementById('walletAddress');
    const amountInput = document.getElementById('withdrawAmount');
    const networkInput = document.getElementById('withdrawNetwork');

    const rawUser = userInput ? userInput.value.trim() : "";
    const address = addressInput ? addressInput.value.trim() : "";
    const amount = amountInput ? parseFloat(amountInput.value) : 0;
    const network = networkInput ? networkInput.value : "TRC20";

    if (!rawUser) {
        alert("⚠️ يرجى إدخال اسم الحساب.");
        return;
    }
    if (!address) {
        alert("⚠️ يرجى إدخال عنوان المحفظة.");
        return;
    }
    if (!amount || amount <= 0) {
        alert("⚠️ يرجى إدخال مبلغ سحب صحيح.");
        return;
    }

    const cleanUser = rawUser.replace(/[^a-zA-Z0-9]/g, "_");

    // نص الرسالة المطابق للإيداع
    const messageText = `📤 **طلب سحب جديد**\n\n` +
                        `👤 **المستخدم:** ${rawUser}\n` +
                        `💰 **المبلغ المطلوب:** ${amount} USDT\n` +
                        `🌐 **الشبكة:** ${network}\n` +
                        `🏦 **العنوان:** \`${address}\``;

    // أزرار التحكم في التليجرام
    const replyMarkup = {
        inline_keyboard: [
            [
                { text: "✅ موافقة وخصم الرصيد", callback_data: `wapprove:${cleanUser}:${amount}` },
                { text: "❌ رفض الطلب", callback_data: `wreject:${cleanUser}` }
            ]
        ]
    };

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

        if (data.ok) {
            alert("✅ تم إرسال طلب السحب بنجاح إلى التليجرام!");
        } else {
            alert("❌ خطأ من التليجرام: " + data.description);
        }
    } catch (error) {
        alert("❌ حدث خطأ في الاتصال: " + error.message);
    }
}
